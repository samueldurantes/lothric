import { type Agent, z } from '@lothric/agent';

import { QuoteModel } from '../models/quote-model';
import { UserModel } from '../models/user-model';

const calculatePrice = (additionalFiles: number) => {
  return additionalFiles * 2;
};

export const requestQuotaIncrease = async (agent: Agent) => {
  agent.method(
    '/request-quota-increase',
    {
      auth: {
        required: true,
      },
      input: z.object({
        additionalFiles: z.number().int().positive().min(1),
      }),
      output: {
        ok: {
          description: 'Request a quota increase',
          schema: z.object({
            quoteId: z.string(),
            price: z.number(),
            paymentAddress: z.string(),
          }),
        },
        err: {
          description:
            'Return a message when error occurs on request quota increase',
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async ({ additionalFiles }, context) => {
      const price = calculatePrice(additionalFiles);

      const user = await UserModel.findOne({
        walletAddress: context.user?.walletAddress,
      });

      if (!user) {
        return {
          err: {
            message: 'User not found',
          },
        };
      }

      const quote = await new QuoteModel({
        filesRequested: additionalFiles,
        price,
        user,
      }).save();

      return {
        ok: {
          quoteId: quote._id.toString(),
          price,
          paymentAddress: context.agent.address,
        },
      };
    },
  );
};
