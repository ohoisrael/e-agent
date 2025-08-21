const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, lowercase: true, trim: true },
  password: { type: String, required: false },
  phone: { type: String, required: false, unique: true, sparse: true },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'active'], default: 'pending' },
}, { timestamps: true });

// Create superadmin account
userSchema.statics.createSuperAdmin = async function() {
  const superAdminEmail = 'superadmin@gmail.com';
  const existingSuperAdmin = await this.findOne({ email: superAdminEmail });
  
  if (!existingSuperAdmin) {
    const hashedPassword = await bcrypt.hash('1234', 10);
    const superAdmin = new this({
      name: 'Super Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: 'superadmin',
      status: 'active'
    });
    await superAdmin.save();
    console.log('Superadmin account created');
  }
};

// Run superadmin creation when the model is initialized
mongoose.model('User', userSchema).createSuperAdmin();

userSchema.path('email').validate(function (value) {
  return this.phone || value;
}, 'Either email or phone number must be provided');

userSchema.path('phone').validate(function (value) {
  return this.email || value;
}, 'Either email or phone number must be provided');

module.exports = mongoose.model('User', userSchema);