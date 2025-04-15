import { type Agent, z } from '@lothric/agent';

import { uploadToPinata } from '../external/pinata';
import { UserModel } from '../models/user-model';
import { FileModel, FileSchema } from '../models/file-model';

export const pinFile = async (agent: Agent) => {
  agent.method(
    '/pin-file',
    {
      method: 'post',
      auth: {
        required: true,
      },
      input: {
        multipartFormData: true,
        schema: z.object({
          file: z.instanceof(File).openapi({ format: 'binary' }),
        }),
      },
      output: {
        ok: {
          description: 'Pin a file to IPFS',
          schema: z.object({
            file: FileSchema,
          }),
        },
        err: {
          description: 'Return a message when error occurs on pin file',
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async ({ file }, context) => {
      const user = await UserModel.findOne({
        walletAddress: context?.user?.walletAddress,
      });

      if (!user) {
        return {
          err: {
            message: 'User not found',
          },
        };
      }

      if (user.filesAvailable <= 0) {
        return {
          err: {
            message: 'No files available',
          },
        };
      }

      const result = await uploadToPinata({
        file,
        walletAddress: context?.user?.walletAddress,
      });

      if (!result.success) {
        return {
          err: {
            message: result.error,
          },
        };
      }

      const fileUploaded = await new FileModel({
        name: file.name,
        size: file.size,
        cid: result.cid,
        user: user._id,
      }).save();

      await UserModel.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          $inc: { filesAvailable: -1 },
        },
      );

      return {
        ok: {
          file: fileUploaded,
        },
      };
    },
  );
};
