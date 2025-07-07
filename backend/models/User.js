const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, lowercase: true, trim: true },
  password: { type: String, required: false }, // Required only for email/password login
  phone: { type: String, required: false, unique: true, sparse: true }, // Sparse index for unique constraint on existing values
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'active'], default: 'pending' }, // Updated to string enum
}, { timestamps: true });

// Optional custom validator to ensure at least email or phone is provided
userSchema.path('email').validate(function (value) {
  return this.phone || value; // At least one of email or phone must be present
}, 'Either email or phone number must be provided');

userSchema.path('phone').validate(function (value) {
  return this.email || value; // At least one of email or phone must be present
}, 'Either email or phone number must be provided');

module.exports = mongoose.model('User', userSchema);