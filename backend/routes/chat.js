const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const auth = require("../middleware/auth");

router.post("/start", auth, async (req, res) => {
  try {
    const { userId, userName } = req.body;
    const adminId = "admin";
    let chat = await Chat.findOne({ userId, adminId });
    if (!chat) {
      chat = new Chat({ userId, adminId, userName, messages: [] });
      await chat.save();
    }
    res.json({ message: "Chat started", chatId: chat._id, userName });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:chatId", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate("messages.senderId", "name");
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    res.json({
      _id: chat._id,
      userId: chat.userId,
      userName: chat.userName,
      messages: chat.messages.map((msg) => ({
        _id: msg._id,
        senderId: msg.senderId._id,
        senderName: msg.senderName || (msg.senderId.name || (msg.senderId.toString() === chat.userId.toString() ? "You" : "Admin")),
        content: msg.content,
        timestamp: msg.timestamp,
      })),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/admin/chats", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const chats = await Chat.find({ adminId: "admin" }).populate("messages.senderId", "name");
    res.json(
      chats.map((chat) => ({
        _id: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        messages: chat.messages.map((msg) => ({
          _id: msg._id,
          senderId: msg.senderId._id,
          senderName: msg.senderName || (msg.senderId.name || (msg.senderId.toString() === chat.userId.toString() ? "You" : "Admin")),
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      }))
    );
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/send", auth, async (req, res) => {
  try {
    const { chatId, content, senderName } = req.body;
    const senderId = req.user.id;
    console.log("Received send request:", { chatId, content, senderId, senderName, user: req.user });
    if (!senderId) {
      return res.status(400).json({ message: "Sender ID is missing" });
    }
    const chat = await Chat.findById(chatId).populate("messages.senderId", "name");
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const message = { senderId, senderName, content, timestamp: new Date() };
    chat.messages.push(message);
    await chat.save();
    console.log("Message saved:", message);

    const io = req.app.get("io");
    if (io) {
      io.to(chatId.toString()).emit("newMessage", {
        _id: message._id,
        senderId,
        senderName: senderName || (senderId === chat.userId.toString() ? "You" : "Admin"),
        content,
        timestamp: message.timestamp,
      });
      io.to(chatId.toString()).emit("newMessageNotification", { chatId, senderId });
    } else {
      console.error("Socket.IO instance not found in req.app");
    }
    res.json({ message: "Message sent", chatId });
  } catch (error) {
    console.error("Send error:", error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;