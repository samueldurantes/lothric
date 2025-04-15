import { type Agent, z } from '@lothric/agent';

import { FileModel } from '../models/file-model';
import { UserModel } from '../models/user-model';
import { QuotaInfoSchema } from '../types';

export const getQuota = async (agent: Agent) => {
  agent.method(
    '/get-quota',
    {
      method: 'get',
      auth: {
        required: true,
      },
      input: z.object({}),
      output: {
        ok: {
          description: 'Get the quota info',
          schema: z.object({
            quota: QuotaInfoSchema,
          }),
        },
        err: {
          description: 'Return a message when error occurs on get quota',
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

      const filesTotalAvailable = user.filesAvailable;
      const filesTotal = await FileModel.countDocuments({
        user: user._id,
      });

      return {
        ok: {
          quota: {
            filesTotal,
            filesTotalAvailable,
          },
        },
      };
    },
  );
};
