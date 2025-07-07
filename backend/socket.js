const Chat = require("./models/Chat");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinChat", async ({ userId, adminId, chatId, userName }) => {
      const validAdminId = "admin";
      let chat;

      try {
        if (userId === validAdminId && chatId) {
          chat = await Chat.findById(chatId).populate("messages.senderId", "name");
          if (chat) {
            socket.join(chat._id.toString());
            console.log(`Admin ${userId} joined chat ${chat._id} for user ${chat.userId}`);
            socket.emit("chatHistory", {
              messages: chat.messages.map((msg) => ({
                _id: msg._id,
                senderId: msg.senderId._id,
                senderName: msg.senderName || (msg.senderId.name || (msg.senderId.toString() === chat.userId.toString() ? "You" : "Admin")),
                content: msg.content,
                timestamp: msg.timestamp,
              })),
            });
          } else {
            console.error("Chat not found for chatId:", chatId);
            socket.emit("chatHistory", { messages: [] });
          }
        } else if (userId !== validAdminId) {
          chat = await Chat.findOne({ userId, adminId: validAdminId }) || (chatId && (await Chat.findById(chatId).populate("messages.senderId", "name")));
          if (chat) {
            socket.join(chat._id.toString());
            console.log(`User ${userId} joined chat ${chat._id}`);
            socket.emit("chatHistory", {
              messages: chat.messages.map((msg) => ({
                _id: msg._id,
                senderId: msg.senderId._id,
                senderName: msg.senderName || (msg.senderId.name || (msg.senderId.toString() === chat.userId.toString() ? "You" : "Admin")),
                content: msg.content,
                timestamp: msg.timestamp,
              })),
            });
          } else {
            console.error("Chat not found for userId:", userId, "adminId:", adminId);
          }
        }
      } catch (error) {
        console.error("Join chat error:", error);
      }
    });

    socket.on("sendMessage", async ({ chatId, content, senderId, senderName }) => {
      try {
        const chat = await Chat.findById(chatId).populate("messages.senderId", "name");
        if (chat) {
          const message = { senderId, senderName, content, timestamp: new Date() };
          chat.messages.push(message);
          await chat.save();
          io.to(chatId.toString()).emit("newMessage", {
            _id: message._id,
            senderId,
            senderName: senderName || (senderId === chat.userId.toString() ? "You" : "Admin"),
            content,
            timestamp: message.timestamp,
          });
          io.to(chatId.toString()).emit("newMessageNotification", { chatId, senderId });
        }
      } catch (error) {
        console.error("Send message error:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};