/**
 * Generated by orval v7.8.0 🍺
 * Do not edit manually.
 * Gundyr API
 * OpenAPI spec version: 1.0.0
 */
import type { GetGetFiles200FilesItemUser } from './getGetFiles200FilesItemUser';

export type GetGetFiles200FilesItem = {
  name: string;
  size: number;
  cid: string;
  /** @nullable */
  user?: GetGetFiles200FilesItemUser;
  createdAt?: string;
  updatedAt?: string;
};
