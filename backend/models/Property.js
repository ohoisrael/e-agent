const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String, required: true }],
  address: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  area: { type: Number, required: true },
  description: { type: String, required: true },
  facilities: [{ type: String }],
  geolocation: { type: String, required: true },
  status: { type: String, enum: ['available', 'booked'], default: 'available' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  gallery: [{ type: String }],
  phone: { type: String },
});

propertySchema.index({ name: "text", description: "text" });

module.exports = mongoose.model('Property', propertySchema);