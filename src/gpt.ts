import chalk from 'chalk';
import OpenAI from 'openai';

import { Logger } from './logger';
import { prompts } from './prompts';

export const gptLog = Logger.start(chalk.bgGreenBright.bold, 'CHATGPT/CORE');
const wantsResponseLog = Logger.start(chalk.bgYellow.bold, 'CHATGPT/WANTS-RESPONSE');
const responseLog = Logger.start(chalk.bgBlueBright.bold, 'CHATGPT/RESPONSE');

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

gptLog.info('ChatGPT initialized');

export async function askGPT(prompt: string) {
  gptLog.info(chalk.gray('Asking to GPT...'));

  if (!process.env.USE_GPT) {
    throw new Error('GPT not enabled');
  }

  const response = await openai.completions.create({
    model: 'gpt-3.5-turbo-instruct',
    max_tokens: 150,
    prompt,
  });

  gptLog.success('GPT answered, response:', response);

  return response.choices[0].text.trim();
}

const chatContext: string[] = [];

export async function wantsToResponse(username: string, message: string) {
  wantsResponseLog.info('Checking if wants to respond...');

  const fullPrompt = prompts.askOrNo
    .replace('{{username}}', username)
    .replace('{{message}}', message)
    .replace('{{context}}', chatContext.join('\n'));

  const gptResponse = await askGPT(fullPrompt);

  if (['true', 'sim', '"true"', "'true'"].includes(gptResponse.toLowerCase().trim())) {
    wantsResponseLog.info('GPT wants to respond');
    return true;
  }

  wantsResponseLog.info('GPT does not want to respond');
  return false;
}

export async function formulateResponse(username: string, message: string) {
  responseLog.info('Formulating response...');

  const context = chatContext.join('\n');

  const fullPrompt = prompts.context
    .replace('{{username}}', username)
    .replace('{{message}}', message)
    .replace('{{context}}', context);

  chatContext.push(`${username}: ${message}`);

  const gptResponse = await askGPT(fullPrompt);

  let messageCleaned = gptResponse
    .replace('Bot: ', '')
    .replace('Professor: ', '')
    .replace('bot: ', '')
    .replace('professor: ', '')
    .replace('Resposta: ', '')
    .replace('resposta: ', '');

  if (messageCleaned.startsWith('"') && messageCleaned.endsWith('"')) {
    messageCleaned = messageCleaned.slice(1, -1);
  }

  return messageCleaned;
}
