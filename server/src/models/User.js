const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSONPlugin } = require('./plugins');

const userSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address']
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    title: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('User', userSchema);
