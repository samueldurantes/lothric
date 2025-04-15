module.exports = {
  'agent-frontend': {
    input: {
      target: `${process.env.API_URL}/docs`,
    },
    output: {
      mode: 'tags-split',
      target: './src/schema/schema.ts',
      schemas: './src/schema/model',
      client: 'react-query',
      httpClient: 'fetch',
      baseUrl: process.env.API_URL,
      override: {
        mutator: {
          path: './src/lib/fetcher.ts',
          name: 'fetcher',
        },
      },
    },
  },
};
