const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  adminId: { type: String, enum: ["admin"], default: "admin", required: true },
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      senderName: { type: String, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
}, {
  minimize: false,
});

module.exports = mongoose.model("Chat", chatSchema);