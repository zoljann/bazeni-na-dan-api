import { Schema, model } from 'mongoose';

const filtersSchema = new Schema(
  {
    heated: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    partyAllowed: { type: Boolean, default: false },
    wiFi: { type: Boolean, default: false },
    bbq: { type: Boolean, default: false }
  },
  { _id: false }
);

const poolSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 40 },
    city: { type: String, required: true, trim: true, index: true },
    capacity: { type: Number, required: true, min: 1, max: 100 },
    images: {
      type: [String],
      validate: [(arr: string[]) => arr.length >= 1 && arr.length <= 7, 'images length 1..7']
    },
    pricePerDay: { type: Number, min: 1, max: 10000 },
    description: { type: String, maxlength: 800 },
    rulesDescription: { type: String, maxlength: 650 },
    checkIn: { type: Number, min: 1, max: 24 },
    checkOut: { type: Number, min: 1, max: 24 },
    filters: { type: filtersSchema, default: undefined },
    busyDays: { type: [String], default: undefined },
    isVisible: { type: Boolean, default: false, index: true },
    visibleUntil: { type: Date, default: null, index: true },
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);

poolSchema.index({ isVisible: 1, visibleUntil: 1, createdAt: -1 });

poolSchema.set('toObject', {
  versionKey: false,
  transform(_doc, ret: any) {
    ret.id = String(ret._id);
    ret.userId = ret.userId ? String(ret.userId) : undefined;
    delete ret._id;
    return ret;
  }
});

poolSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret: any) {
    ret.id = String(ret._id);
    ret.userId = ret.userId ? String(ret.userId) : undefined;
    delete ret._id;
    return ret;
  }
});

export const Pool = model('Pool', poolSchema);
