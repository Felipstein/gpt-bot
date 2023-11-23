import './env';

import chalk from 'chalk';
import { Client, GatewayIntentBits } from 'discord.js';
import { ChatCompletionMessageParam } from 'openai/resources';

import { gptLog, openai } from './gpt';
import { Logger } from './logger';
import { prompts } from './prompts';

const botLog = Logger.start(chalk.bgCyan.bold, 'BOT');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', async () => {
  botLog.info(`Bot connected with profile ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.discriminator === '9571') {
    return;
  }

  // if (message.channelId !== '1176987500636541069') {
  //   botLog.warn('Incorrect chat, ignoring...');
  //   return;
  // }

  if (message.channelId !== '1177255469388157038') {
    botLog.warn('Incorrect chat, ignoring...');
    return;
  }

  message.channel.sendTyping();

  botLog.info('Getting last 30 messages...');

  const lastMessages = await message.channel.messages.fetch({ limit: 30 });

  const context: ChatCompletionMessageParam[] = lastMessages.map((lastMessage) => ({
    role: ['Professor', 'Professor Bot'].includes(lastMessage.author.username) ? 'assistant' : 'user',
    content: lastMessage.content,
  }));

  context.reverse();

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: prompts.context },
      { role: 'user', content: 'Alfa: mereço um bom dia?' },
      { role: 'assistant', content: 'merece eu te dar um chute na bunda' },
      { role: 'user', content: 'FarRed: oloco professor, precisa disso? kkkk' },
      { role: 'assistant', content: 'com quem merece, precisa sim :)' },
      { role: 'user', content: 'iceseconds: bom dia pessoal' },
      { role: 'assistant', content: 'bom dia iceseconds, bora uma callzinha?' },
      ...context,
      {
        role: 'user',
        content: prompts.contextReplaceble
          .replace('{{username}}', message.author.username)
          .replace('{{message}}', message.content),
      },
    ],
  });

  const choice = completion.choices[0];

  gptLog.info(choice);

  const response = choice.message.content;

  if (response) {
    message.reply(response);
  } else {
    gptLog.warn('No response provided');
  }
});

client
  .login(process.env.DISCORD_BOT_TOKEN)
  .then(() => {
    botLog.success('Logged in!');
  })
  .catch((err) => {
    botLog.error('An error ocurred:', err);
  });
