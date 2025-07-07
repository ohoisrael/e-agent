const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const OTP = require('../models/OTP');
const sms = require('../utils/sms');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const user = new User({ name, email, password: hashedPassword, phone });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET);
    res.status(201).json({ message: 'User registered', userId: user._id, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || (password && !(await bcrypt.compare(password, user.password)))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/google', async (req, res) => {
  const token = jwt.sign({ id: 'googleUser123', role: 'user' }, process.env.JWT_SECRET);
  res.json({ token });
});

router.post('/login/phone', async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone }) || new User({ phone, name: `User_${phone}`, role: 'user' });
    await user.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireIn = Date.now() + 15 * 60 * 1000;
    const otpDoc = new OTP({ userId: user._id, otp, expireIn, status: 'pending' });
    await otpDoc.save();

    await sms.sendOTP(phone, otp); // Use phone as provided (e.g., 0201818192)

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ userId: user._id, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/register/phone', async (req, res) => {
  try {
    const { phone, name } = req.body;
    const user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const newUser = new User({ phone, name, role: 'user', status: 'pending' });
    await newUser.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireIn = Date.now() + 15 * 60 * 1000;
    const otpDoc = new OTP({ userId: newUser._id, otp, expireIn, status: 'pending' });
    await otpDoc.save();

    await sms.sendOTP(phone, otp); // Use phone as provided (e.g., 0201818192)

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET);
    res.json({ userId: newUser._id, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/verify-phone', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const otpDoc = await OTP.findOne({ userId, otp, status: 'pending', expireIn: { $gt: Date.now() } });
    if (!otpDoc) return res.status(400).json({ message: 'Invalid or expired OTP' });

    otpDoc.status = 'confirmed';
    await otpDoc.save();

    const user = await User.findById(userId);
    if (user.status === 'pending') {
      user.status = 'active';
      await user.save();
    }

    const token = jwt.sign({ id: userId, role: user.role }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;