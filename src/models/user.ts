import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    firstName:     { type: String, required: true, trim: true },
    lastName:      { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobileNumber:  { type: String, required: true },
    passwordHash:  { type: String, required: true },
    avatarUrl:     { type: String }
  },
  { timestamps: true }
);

// Transform all outputs (JSON & object):
userSchema.set('toObject', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  }
});
userSchema.set('toJSON', userSchema.get('toObject'));

export const User = model('User', userSchema);
