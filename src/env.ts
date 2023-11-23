/* eslint-disable no-unused-vars */

import 'dotenv/config';

import chalk from 'chalk';
import { ZodError, z } from 'zod';

import { Logger } from './logger';

console.info('\n\n');
console.clear();

const envLog = Logger.start(chalk.bgMagenta.bold, 'ENV');

envLog.info(chalk.gray('Loading environment variables...'));

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, 'Required'),
  OPENAI_API_KEY: z.string().min(1, 'Required'),
  USE_GPT: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

try {
  const parsed = envSchema.parse(process.env);

  if (parsed.USE_GPT) {
    envLog.warn('Using GPT! Pay attention to your OpenAI API Usage.');
  }

  // @ts-ignore
  process.env = {
    ...process.env,
    ...parsed,
  };
} catch (err: unknown) {
  if (err instanceof ZodError) {
    envLog.error('An error occurred on loading environment variables:');

    err.issues.forEach((issue) => {
      console.info(chalk.gray.bold('-'), chalk.red.bold(issue.path.join('.')), chalk.italic(issue.message));
    });

    process.exit(1);
  }

  throw err;
}

envLog.info('Environment variables loaded.');

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
