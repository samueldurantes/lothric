import { Schema, model } from 'mongoose';

import { z } from '@lothric/agent';

export const UserSchema = z.object({
  walletAddress: z.string(),
  filesAvailable: z.number(),
  quotes: z.array(z.any()),
  files: z.array(z.any()),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

const mongooseSchema = new Schema<User>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    filesAvailable: {
      type: Number,
      default: 0,
    },
    quotes: {
      type: [Schema.Types.ObjectId],
      ref: 'Quote',
      default: [],
    },
    files: {
      type: [Schema.Types.ObjectId],
      ref: 'File',
      default: [],
    },
  },
  {
    collection: 'User',
    timestamps: true,
  },
);

mongooseSchema.pre('save', function (next) {
  try {
    UserSchema.parse(this.toObject());
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const UserModel = model<User>('User', mongooseSchema);
