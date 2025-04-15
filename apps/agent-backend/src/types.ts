import { z } from '@lothric/agent';

export type CID = string & { readonly __brand: unique symbol };
export const CIDSchema = z.string().transform((value) => value as CID);
