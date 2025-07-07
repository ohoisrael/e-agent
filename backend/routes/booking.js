const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { propertyId } = req.body;
    const booking = new Booking({ 
      userId: req.user.id, 
      propertyId,
      status: 'confirmed' 
    });
    await booking.save();
    res.status(201).json({ 
      bookingId: booking._id,
      createdAt: booking.createdAt 
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(400).json({ message: error.message || 'Failed to create booking' });
  }
});

router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const bookings = await Booking.find().populate('userId propertyId');
    res.json(bookings);
  } catch (error) {
    console.error('Admin bookings fetch error:', error);
    res.status(400).json({ message: error.message || 'Failed to fetch bookings' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized access' });
    const bookings = await Booking.find({ userId }).populate('propertyId');
    res.json(bookings);
  } catch (error) {
    console.error('User bookings fetch error:', error);
    res.status(400).json({ message: error.message || 'Failed to fetch bookings' });
  }
});

module.exports = router;