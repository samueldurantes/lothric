import { Agent, z } from '../packages/agent/src';

const agent = new Agent({
  port: 3001,
  auth: {
    secret: 'test',
  },
  docs: {
    info: {
      title: 'Gundyr API docs',
      version: '0.0.1',
    },
  },
}).method(
  '/test',
  {
    auth: {
      required: true,
    },
    input: z.object({
      cid: z.string(),
    }),
    output: {
      ok: {
        description: 'CID',
        schema: z.object({
          cid: z.string(),
        }),
      },
      err: {
        description: 'Error',
        schema: z.object({
          message: z.string(),
        }),
      },
    },
  },
  async ({ cid }, helpers) => {
    if (!cid.length) {
      return {
        err: {
          message: 'CID is required',
        },
      };
    }

    return {
      ok: {
        cid,
      },
    };
  },
);

agent.run();
