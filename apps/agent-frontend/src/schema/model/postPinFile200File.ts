/**
 * Generated by orval v7.8.0 🍺
 * Do not edit manually.
 * Gundyr API
 * OpenAPI spec version: 1.0.0
 */
import type { PostPinFile200FileUser } from './postPinFile200FileUser';

export type PostPinFile200File = {
  name: string;
  size: number;
  cid: string;
  /** @nullable */
  user?: PostPinFile200FileUser;
  createdAt?: string;
  updatedAt?: string;
};
