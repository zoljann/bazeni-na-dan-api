import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobileNumber: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['host','admin'], default: 'host' },
  avatarUrl: { type: String }
}, { timestamps: true });

export const User = model('User', userSchema);
