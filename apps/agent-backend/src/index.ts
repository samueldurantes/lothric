import { Agent } from '@lothric/agent';

import { config } from './config';
import { connectDatabase } from './database';
import { checkSession } from './methods/check-session';
import { confirmPayment } from './methods/confirm-payment';
import { getFiles } from './methods/get-files';
import { pinFile } from './methods/pin-file';
import { requestQuotaIncrease } from './methods/request-quota-increase';
import { UserModel } from './models/user-model';

const agent = new Agent({
  address: config.AGENT_ADDRESS,
  port: 3000,
  auth: {
    secret: 'secret',
    onAfterAuth: async ({ walletAddress }) => {
      const user = await UserModel.findOne({
        walletAddress,
      });

      if (user) {
        return;
      }

      await new UserModel({
        walletAddress,
      }).save();
    },
  },
  docs: {
    enabled: true,
    info: {
      title: 'Gundyr API',
      version: '1.0.0',
    },
  },
});

pinFile(agent);
requestQuotaIncrease(agent);
checkSession(agent);
confirmPayment(agent);
getFiles(agent);

(async () => {
  try {
    await connectDatabase();
    agent.run();
  } catch (error) {
    console.error('Failed to connect to database', error);
    process.exit(1);
  }
})();
