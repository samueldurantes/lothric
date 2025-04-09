import { hexToString } from '@polkadot/util';
import { cryptoWaitReady, decodeAddress, signatureVerify } from '@polkadot/util-crypto';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

export const ensureTrailingSlash = (path: string) => {
  return path.startsWith('/') ? path : `/${path}`;
};

export type SS58Address = string & { readonly __brand: unique symbol };

export function checkSS58(value: string | SS58Address): SS58Address {
  try {
    decodeAddress(value);
  } catch (err) {
    throw new Error(`Invalid SS58 address: ${value}`, { cause: err });
  }

  return value as SS58Address;
}

export function isSS58(value: string | null | undefined): value is SS58Address {
  try {
    decodeAddress(value);
  } catch (_) {
    return false;
  }

  return true;
}

const SS58Schema = z.string().refine<SS58Address>(isSS58, 'Invalid SS58 address');

const TokenDataSchema = z.object({
  userKey: SS58Schema,
  uri: z.string(),
});

export const createAuthToken = (tokenData: z.infer<typeof TokenDataSchema>, jwtSecret: string) => {
  const token = jwt.sign(tokenData, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });

  return token;
};

export const AuthReqSchema = z.object({
  statement: z.string(),
  uri: z.string(),
  nonce: z.string(),
  created: z.string().datetime(),
});

export const SignedPayloadSchema = z.object({
  payload: z.string({ description: 'in hex' }),
  signature: z.string({ description: 'in hex' }),
  address: z.string({ description: 'in hex' }),
});

export type SignedPayload = z.infer<typeof SignedPayloadSchema>;

export const verifySignedData = async (signedInput: SignedPayload) => {
  await cryptoWaitReady();

  const { payload, signature, address } = signedInput;

  const result = signatureVerify(payload, signature, address);
  if (!result.isValid) {
    throw new Error('Invalid signature');
  }

  const decoded = JSON.parse(hexToString(payload)) as unknown;
  const validated = AuthReqSchema.safeParse(decoded);

  if (!validated.success) {
    throw new Error(`Invalid payload: ${validated.error.message}`);
  }
  return { payload: validated.data, address: checkSS58(address) };
};

const seenNonces = new Map<string, number>();
let lastNonceCleanup = Date.now();

export const verifyAuthRequest = (data: z.infer<typeof AuthReqSchema>, authOrigin: string) => {
  if (data.uri !== authOrigin) {
    throw new Error(`Invalid origin: ${data.uri}`);
  }

  if (new Date(data.created).getTime() + 10 * 60 * 1000 < Date.now()) {
    throw new Error('Session data is too old');
  }

  if (seenNonces.has(data.nonce)) {
    throw new Error('Nonce has been used before');
  }

  seenNonces.set(data.nonce, Date.now());

  const HOUR = 60 * 60 * 1000;
  if (lastNonceCleanup + HOUR < Date.now()) {
    for (const [nonce, timestamp] of seenNonces.entries()) {
      if (timestamp + HOUR < Date.now()) {
        seenNonces.delete(nonce);
      }
    }
    lastNonceCleanup = Date.now();
  }
};
