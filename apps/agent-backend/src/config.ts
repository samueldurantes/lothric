import dotenvSafe from 'dotenv-safe';
import path from 'path';

const cwd = process.cwd();

const root = path.join.bind(cwd);

const getEnvFile = (): string => {
  if (process.env.ENV_FILE !== undefined) {
    return process.env.ENV_FILE;
  }

  return '.env';
};

const envFile = getEnvFile();

dotenvSafe.config({
  path: root(envFile),
  sample: root('.env.example'),
  allowEmptyValues: true,
});

export const config = {
  MONGO_URI: process.env.MONGO_URI as string,
  PINATA_JWT_SECRET: process.env.PINATA_JWT_SECRET as string,
  AGENT_ADDRESS: process.env.AGENT_ADDRESS as string,
};
