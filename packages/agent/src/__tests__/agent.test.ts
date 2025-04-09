import { z } from 'zod';
import { Agent } from '../agent';

const agent = new Agent({
  port: 3000,
  auth: {
    secret: 'test',
  },
  docs: {
    info: {
      title: 'Gundyr API docs',
      version: '0.0.1',
    },
  },
});

agent.method(
  'test',
  {
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
  async ({ cid }) => {
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

it('should return 200 when agent call is successful', async () => {
  const cid = 'bafybeigdyrzt6hxz6pe2q4aebvpgib2wn5o5j42x62ksm4qoqnck3sznma';

  const response = await agent.request('/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cid,
    }),
  });

  const resultJson = await response.json();

  expect(response.status).toBe(200);
  expect(resultJson).toEqual({
    cid,
  });
});

it('should return 400 when agent call fails', async () => {
  const response = await agent.request('/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cid: '',
    }),
  });

  expect(response.status).toBe(400);

  const resultJson = await response.json();

  expect(resultJson).toEqual({
    message: 'CID is required',
  });
});

it('should return 400 when auth request is invalid', async () => {
  const response = await agent.request('/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signature: `0x${'1'.repeat(64)}`,
      payload: 'invalid',
      address: 'invalid',
    }),
  });

  expect(response.status).toBe(400);

  const resultJson = await response.json();

  expect(resultJson).toEqual({
    message: 'Invalid request',
  });
});
