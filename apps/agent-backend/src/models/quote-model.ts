import { Schema, model } from 'mongoose';

import { z } from '@lothric/agent';

export const QuoteSchema = z.object({
  filesRequested: z.number(),
  price: z.number(),
  user: z.any(),
  hash: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Quote = z.infer<typeof QuoteSchema>;

const mongooseSchema = new Schema<Quote>(
  {
    filesRequested: { type: Number, required: true },
    price: { type: Number, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hash: { type: String },
  },
  { timestamps: true, collection: 'Quote' },
);

export const QuoteModel = model<Quote>('Quote', mongooseSchema);
