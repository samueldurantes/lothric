import { type Agent, z } from '@lothric/agent';

import { FileModel, FileSchema } from '../models/file-model';
import { UserModel } from '../models/user-model';

export const getFiles = async (agent: Agent) => {
  agent.method(
    '/get-files',
    {
      method: 'get',
      auth: {
        required: true,
      },
      input: z.object({}),
      output: {
        ok: {
          description: 'Get the files info',
          schema: z.object({
            files: z.array(FileSchema),
          }),
        },
        err: {
          description: 'Return a message when error occurs on get files',
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (_, context) => {
      const user = await UserModel.findOne({
        walletAddress: context?.user?.walletAddress,
      });

      if (!user) {
        return {
          err: {
            message: 'User not authenticated',
          },
        };
      }

      const files = await FileModel.find({
        user: user._id,
      });

      return {
        ok: {
          files,
        },
      };
    },
  );
};
