import { type Agent, z } from '@lothric/agent';

import { QuoteModel } from '../models/quote-model';
import { UserModel } from '../models/user-model';

export const confirmPayment = async (agent: Agent) => {
  agent.method(
    '/confirm-payment',
    {
      method: 'post',
      auth: {
        required: true,
      },
      input: z.object({
        quoteId: z.string(),
        blockHash: z.string(),
      }),
      output: {
        ok: {
          description: 'Confirm a payment',
          schema: z.object({
            message: z.string(),
          }),
        },
        err: {
          description: 'Return a message when error occurs on confirm payment',
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async ({ quoteId, blockHash }, context) => {
      const quote = await QuoteModel.findById(quoteId);

      if (!quote) {
        return {
          err: {
            message: 'Quote not found',
          },
        };
      }

      const { isValid } = await context.checkTransaction(blockHash);

      if (!isValid) {
        return {
          err: {
            message: 'Payment failed',
          },
        };
      }

      const quoteUpdated = await QuoteModel.findOneAndUpdate(
        {
          _id: quote._id,
        },
        {
          hash: blockHash,
        },
        {
          new: true,
        },
      );

      if (!quoteUpdated) {
        return {
          err: {
            message: 'Failed to update quote',
          },
        };
      }

      const userUpdated = await UserModel.findOneAndUpdate(
        {
          walletAddress: context.user?.walletAddress,
        },
        {
          $inc: {
            filesAvailable: quoteUpdated.filesRequested,
          },
        },
      );

      if (!userUpdated) {
        return {
          err: {
            message: 'Failed to update user',
          },
        };
      }

      return {
        ok: {
          message: 'Payment confirmed',
        },
      };
    },
  );
};
