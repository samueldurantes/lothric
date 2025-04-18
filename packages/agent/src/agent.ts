import { serve } from '@hono/node-server';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import type { ApiPromise } from '@polkadot/api';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

import { type Helpers, checkTransaction, connectToChainRpc } from './helpers';
import {
  type SS58Address,
  SignedPayloadSchema,
  createAuthToken,
  decodeAuthToken,
  ensureTrailingSlash,
  verifyAuthRequest,
  verifySignedData,
} from './utils';

/**
 * User type definition
 */
type User = {
  /** The wallet address of the user */
  walletAddress: SS58Address;
};

/**
 * Configuration options for the Agent class
 */
type AgentOptions = {
  /** The address of the agent */
  address: string;
  /** Port number for the server to listen on. Defaults to 3000 if not specified */
  port?: number;
  /** Authentication configuration */
  auth: {
    /** The path to the authentication method. @default '/auth' */
    path?: string;
    /** The secret key for the authentication method */
    secret: string;
    /** The name of the header to check for authentication. @default 'Authorization' */
    headerName?: string;
    /** The callback to be called after the authentication is successful */
    onAfterAuth?: (user: User) => Promise<void> | void;
  };
  /** Documentation configuration */
  docs: {
    /** Whether to enable OpenAPI documentation. Defaults to true if not specified */
    enabled?: boolean;
    /** Path where the OpenAPI documentation will be served. Defaults to '/docs' */
    path?: string;
    /** OpenAPI documentation metadata */
    info: {
      /** Title of the API */
      title: string;
      /** Version of the API */
      version: string;
    };
  };
};

/**
 * Options for defining a method's input and output schemas
 * @template I - Input schema type
 * @template O - Output schema type for successful responses
 * @template E - Error schema type
 */
type MethodOptions<
  I extends z.ZodSchema,
  O extends z.ZodSchema,
  E extends z.ZodSchema | undefined,
> = {
  /** The HTTP method to use for the method. @default 'post' */
  method?: 'get' | 'post';
  auth?: {
    /** Whether the method requires authentication. @default false */
    required?: boolean;
  };
  /** Input validation schema */
  input:
    | I
    | {
        /** Input validation schema */
        schema: I;
        /** Whether the input is a multipart form data */
        multipartFormData: boolean;
      };
  /** Output configuration for both successful and error responses */
  output: {
    /** Configuration for successful responses */
    ok: {
      /** Description of the successful response */
      description: string;
      /** Schema for the successful response */
      schema: O;
    };
    /** Configuration for error responses */
    err: {
      /** Description of the error response */
      description: string;
      /** Schema for the error response */
      schema: E;
    };
  };
};

/**
 * Callback function type for handling method requests
 * @template I - Input schema type
 * @template O - Output schema type for successful responses
 * @template E - Error schema type
 * @param input - The validated input data based on the input schema
 * @param helpers - A collection of helper functions and utilities that can be used within the callback
 * @returns A Promise that resolves to either a successful response with `ok` or an error response with `err`
 *
 * @example
 * ```typescript
 * const callback: MethodCallback<InputSchema, OutputSchema, ErrorSchema> = async (input, helpers) => {
 *   // Process the input
 *   const result = await someAsyncOperation(input);
 *
 *   // Return success
 *   return { ok: { message: 'Success', data: result } };
 *
 *   // Or return error
 *   return { err: { message: 'Something went wrong', code: 'ERROR_CODE' } };
 * };
 * ```
 */
type MethodCallback<
  I extends z.ZodSchema,
  O extends z.ZodSchema,
  E extends z.ZodSchema,
> = (
  input: z.infer<I>,
  context: {
    user?: User;
    agent: {
      /** The address of the agent */
      address: string;
    };
  } & Helpers,
) => Promise<{ ok: z.infer<O> } | { err: z.infer<E> }>;

/**
 * Agent class for creating and managing API endpoints with OpenAPI documentation
 *
 * This class provides a simple way to create API endpoints with automatic OpenAPI documentation
 * generation. It uses Hono for routing and Zod for schema validation.
 *
 * @example
 * ```typescript
 * const agent = new Agent({
 *   port: 3000,
 *   docs: {
 *     info: {
 *       title: 'My API',
 *       version: '1.0.0'
 *     }
 *   }
 * });
 *
 * agent.method('hello', {
 *   input: z.object({ name: z.string() }),
 *   output: {
 *     ok: {
 *       description: 'Successful response',
 *       schema: z.object({ message: z.string() })
 *     },
 *     err: {
 *       description: 'Error response',
 *       schema: z.object({ error: z.string() })
 *     }
 *   }
 * }, async (input) => {
 *   return { ok: { message: `Hello ${input.name}!` } };
 * });
 *
 * agent.run();
 * ```
 */
export class Agent {
  /** Hono application instance */
  private app: OpenAPIHono = new OpenAPIHono();
  private api!: ApiPromise;
  /** Agent configuration options */
  private options: AgentOptions;

  /**
   * Creates a new Agent instance
   * @param options - Configuration options for the Agent
   */
  constructor(options: AgentOptions) {
    this.options = options;
    this.init();
  }

  /**
   * Initializes the Agent instance
   * @private
   */
  private async init() {
    this.app.use('*', cors());

    this.api = await connectToChainRpc();

    this.setupDocs();
    this.setupAuth();
  }

  /**
   * Sets up authentication method
   * @private
   */
  private setupAuth() {
    const { path } = this.options.auth ?? {};

    const authRoute = createRoute({
      method: 'post',
      path: path ?? '/auth',
      request: {
        body: {
          content: {
            'application/json': {
              schema: SignedPayloadSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Authentication successful',
          content: {
            'application/json': {
              schema: z.object({
                token: z.string(),
                authenticationType: z.literal('Bearer'),
              }),
            },
          },
        },
        400: {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: z.object({
                message: z.string(),
              }),
            },
          },
        },
      },
    });

    const handler = async (c: Context) => {
      try {
        const signedInput = await c.req.json();
        const { payload, address } = await verifySignedData(signedInput);

        verifyAuthRequest(payload, c.req.header('origin') ?? '');

        const token = createAuthToken(
          { uri: payload.uri, userKey: address },
          this.options.auth.secret,
        );

        await this.options.auth.onAfterAuth?.({ walletAddress: address });

        return c.json({ token, authenticationType: 'Bearer' as const }, 200);
      } catch (error) {
        console.error('Error verifying auth request', error);
        return c.json({ message: 'Invalid request' }, 400);
      }
    };

    this.app.openapi(authRoute, handler);
  }

  /**
   * Sets up OpenAPI documentation if enabled
   * @private
   */
  private setupDocs() {
    const { docs } = this.options;

    if (docs.enabled === false) {
      return;
    }

    this.app.doc(docs?.path ?? '/docs', {
      openapi: '3.0.0',
      info: docs.info,
    });
  }

  /**
   * Registers a new API method
   * @template I - Input schema type
   * @template O - Output schema type for successful responses
   * @template E - Error schema type
   * @param name - Name of the method (will be used as the endpoint path)
   * @param options - Method configuration including input/output schemas
   * @param callback - Function to handle the method request
   */
  method<I extends z.ZodSchema, O extends z.ZodSchema, E extends z.ZodSchema>(
    name: string,
    options: MethodOptions<I, O, E>,
    callback: MethodCallback<I, O, E>,
  ) {
    const httpMethod = options?.method ?? 'post';

    const newMethodSchema = createRoute({
      method: httpMethod,
      path: ensureTrailingSlash(name),
      security: options.auth?.required ? [{ Bearer: [] }] : undefined,
      request: {
        ...(httpMethod === 'post'
          ? {
              body: {
                content: {
                  ...(typeof options.input === 'object' &&
                  'multipartFormData' in options.input &&
                  options.input.multipartFormData
                    ? {
                        'multipart/form-data': {
                          schema: options.input.schema,
                        },
                      }
                    : {
                        'application/json': {
                          schema: options.input,
                        },
                      }),
                },
              },
            }
          : {}),
      },
      responses: {
        200: {
          description: options.output.ok.description,
          content: {
            'application/json': {
              schema: options.output.ok.schema,
            },
          },
        },
        400: {
          description: options.output.err.description,
          content: {
            'application/json': {
              schema: options.output.err.schema,
            },
          },
        },
        ...(options.auth?.required
          ? {
              401: {
                description: 'Unauthorized',
                content: {
                  'application/json': {
                    schema: z.object({
                      message: z.string(),
                    }),
                  },
                },
              },
            }
          : {}),
      },
    });

    const handler: any = async (c: Context) => {
      let decodedToken;
      if (options.auth?.required) {
        const token = c.req
          .header(this.options.auth.headerName ?? 'Authorization')
          ?.split(' ')[1];
        if (!token) {
          return c.json({ message: 'Missing authentication token' }, 401);
        }
        decodedToken = decodeAuthToken(token, this.options.auth.secret);
      }

      const isMultipartFormData =
        'multipartFormData' in options.input && options.input.multipartFormData;

      let input;
      if (
        httpMethod === 'post' &&
        typeof options.input === 'object' &&
        'multipartFormData' in options.input &&
        options.input.multipartFormData
      ) {
        const formData = await c.req.formData();
        input = Object.fromEntries(formData.entries());
      }

      if (httpMethod === 'post' && !isMultipartFormData) {
        input = await c.req.json();
      }

      const context = {
        ...(decodedToken
          ? { user: { walletAddress: decodedToken.userKey } }
          : {}),
        agent: {
          address: this.options.address,
        },
        checkTransaction: checkTransaction(this.api),
      };

      const result = await callback(input, context);

      if ('ok' in result) {
        return c.json(result.ok);
      }

      return c.json(result.err, 400);
    };

    this.app.openapi(newMethodSchema, handler);

    return this;
  }

  /**
   * Returns the Request handler
   * @returns The Request handler
   */
  public request = this.app.request;

  /**
   * Starts the server and begins listening for requests
   */
  public run() {
    serve(
      {
        fetch: this.app.fetch,
        port: this.options.port ?? 3000,
      },
      (info) => console.log(`Server running on port ${info.port}`),
    );
  }
}
