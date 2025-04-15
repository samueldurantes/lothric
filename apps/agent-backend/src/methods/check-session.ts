import { type Agent, z } from '@lothric/agent';

import { UserModel } from '../models/user-model';

export const checkSession = async (agent: Agent) => {
  agent.method(
    '/check-session',
    {
      method: 'get',
      auth: {
        required: true,
      },
      input: z.object({}),
      output: {
        ok: {
          description: 'Return the user session',
          schema: z.object({
            user: z.object({
              id: z.string(),
              walletAddress: z.string(),
              files: z.array(z.string()),
              quotes: z.array(z.string()),
              filesAvailable: z.number(),
            }),
          }),
        },
        err: {
          description: 'Return a message when error occurs on check session',
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
            message: 'User not found',
          },
        };
      }

      return {
        ok: {
          user: {
            id: user._id.toString(),
            walletAddress: user.walletAddress,
            files: user.files,
            quotes: user.quotes,
            filesAvailable: user.filesAvailable,
          },
        },
      };
    },
  );
};
