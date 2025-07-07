const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const paystack = require('../utils/paystack');

router.post('/initialize', auth, async (req, res) => {
  try {
    const { propertyId, amount } = req.body;
    const email = req.user.email || 'billycole414@gmail.com';
    const response = await paystack.initializeTransaction({ email, amount: amount, propertyId });
    const payment = new Payment({ 
      userId: req.user.id, 
      propertyId, 
      amount, 
      paystackRef: response.data.reference
    });
    await payment.save();
    res.json({ 
      authorization_url: response.data.authorization_url, 
      reference: response.data.reference, 
      paymentId: payment._id 
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(400).json({ message: error.message || 'Failed to initialize payment' });
  }
});

router.get('/verify/:reference', auth, async (req, res) => {
  try {
    const { reference } = req.params;
    const response = await paystack.verifyTransaction(reference);
    const payment = await Payment.findOne({ paystackRef: reference });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    
    if (response.data.status === 'success') {
      payment.status = 'success';
      await payment.save();
      const property = await Property.findById(payment.propertyId);
      if (property && property.status === 'available') {
        property.status = 'booked';
        await property.save();
      }
    } else {
      payment.status = 'failed';
      await payment.save();
    }
    res.json({ status: payment.status === 'success' ? 'paid' : 'failed' });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(400).json({ message: error.message || 'Failed to verify payment' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const payment = await Payment.findOne({ paystackRef: reference });
      if (payment && payment.status !== 'success') {
        payment.status = 'success';
        await payment.save();
        const property = await Property.findById(payment.propertyId);
        if (property && property.status === 'available') {
          property.status = 'booked';
          await property.save();
        }
      }
    }
    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: error.message || 'Failed to process webhook' });
  }
});

router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const payments = await Payment.find().select('status');
    res.json(payments.map(p => p.status === 'success' ? 'paid' : 'failed'));
  } catch (error) {
    console.error('Admin payments fetch error:', error);
    res.status(400).json({ message: error.message || 'Failed to fetch payments' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized access' });
    const payments = await Payment.find({ userId }).select('status');
    res.json(payments.map(p => p.status === 'success' ? 'paid' : 'failed'));
  } catch (error) {
    console.error('User payments fetch error:', error);
    res.status(400).json({ message: error.message || 'Failed to fetch payments' });
  }
});

module.exports = router;