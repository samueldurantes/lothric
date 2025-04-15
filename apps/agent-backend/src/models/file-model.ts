import { Schema, model } from 'mongoose';

import { z } from '@lothric/agent';

export const FileSchema = z.object({
  name: z.string(),
  size: z.number(),
  cid: z.string(),
  user: z.any(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type File = z.infer<typeof FileSchema>;

const mongooseSchema = new Schema<File>(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true },
    cid: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'File' },
);

export const FileModel = model<File>('File', mongooseSchema);
