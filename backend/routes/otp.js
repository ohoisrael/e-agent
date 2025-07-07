const express = require('express');
const router = express.Router();
const OTP = require('../models/OTP');
const sms = require('../utils/sms');
const otpGenerator = require('otp-generator');

router.post('/send', async (req, res) => {
  try {
    const { userId, phone } = req.body;
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    const expireIn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    await OTP.findOneAndDelete({ userId, status: 'pending' }); // Clear old pending OTP
    const newOTP = new OTP({ userId, otp, expireIn });
    await newOTP.save();
    await sms.sendOTP(phone, otp); // Use phone as provided (e.g., 0201818192)
    res.json({ message: 'OTP sent', otpId: newOTP._id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const otpDoc = await OTP.findOne({ userId, otp, status: 'pending', expireIn: { $gt: Date.now() } });
    if (!otpDoc) return res.status(400).json({ message: 'Invalid or expired OTP' });
    otpDoc.status = 'confirmed';
    await otpDoc.save();
    res.json({ message: 'OTP verified' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;