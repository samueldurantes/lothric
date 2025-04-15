import type { CID } from '../types';
import { config } from '../config';

type UploadToPinataArgs = {
  file: File;
  walletAddress?: string;
};

type UploadToPinataResult =
  | {
      success: true;
      cid: CID;
    }
  | {
      success: false;
      error: string;
    };

export const pinFileToIPFS = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.PINATA_JWT_SECRET}`,
      },
      body: formData,
    }
  );

  const result = (await response.json()) as { IpfsHash: CID };

  return result;
};

export const uploadToPinata = async ({
  file,
  walletAddress,
}: UploadToPinataArgs): Promise<UploadToPinataResult> => {
  if (!walletAddress) {
    return {
      success: false,
      error: 'Wallet address is required',
    };
  }

  try {
    const result = await pinFileToIPFS(file);

    return {
      success: true,
      cid: result.IpfsHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
