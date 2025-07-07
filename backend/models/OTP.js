const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otp: { type: String, required: true },
  expireIn: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
});

module.exports = mongoose.model('OTP', otpSchema);