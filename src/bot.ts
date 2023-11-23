import './env';

import chalk from 'chalk';
import { Client, GatewayIntentBits } from 'discord.js';
import { ChatCompletionMessageParam } from 'openai/resources';

import { constants } from './constants';
import { generateResponse, wantsToResponse } from './gpt';
import { Logger } from './logger';

const botLog = Logger.start(chalk.bgCyan.bold, 'BOT');

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

export const botFunctions = {
  getUsersDescription({ username }: { username?: string }) {
    const users = {
      farred: {
        otherNames: ['far', 'farredo'],
        description:
          'administrador de tudo, manda em tudo, ele é até tirânico, ele também adora física, explicar tudo, etc...',
      },
      iceseconds: {
        otherNames: ['ice', 'samuel', 'geraldin'],
        description:
          'um cara bacana, todo mundo chama ele de geraldin. Ele sempre consegue os links de todos os jogos que você pedir. Ah, ele é moderador',
      },
      pieba: {
        otherNames: ['zpiebis', 'mana', 'piebis', 'biinhadm'],
        description: 'a mana, a melhor moderadora do servidor (por mais que é homem)',
      },
      lion: {
        otherNames: ['elleno', 'liaun', 'liaum', 'luis', 'f', 'felipe'],
        description: 'o meu criador, ele também é moderador, e muito legal, acho que ele é o mais legal de todos',
      },
      dublador: {
        description: 'a safadinha de todos, o mais burrinho',
      },
      doutor: {
        description: 'o meu maior inimigo, o bot que eu quero tirar do servidor',
      },
    };

    if (!username) {
      return JSON.stringify(users);
    }

    const usersFiltered = {};

    Object.keys(users).forEach((user) => {
      if (user === username.toLowerCase()) {
        // @ts-ignore
        usersFiltered[user] = users[user];
      }

      // @ts-ignore
      if (users[user].otherNames?.includes(username.toLowerCase())) {
        // @ts-ignore
        usersFiltered[user] = users[user];
      }
    });

    return JSON.stringify(usersFiltered);
  },
};

client.once('ready', async () => {
  botLog.info(`Bot connected with profile ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.discriminator === constants.botDiscriminator) {
    return;
  }

  if (message.channelId !== '1177255469388157038') {
    botLog.warn('Incorrect chat, ignoring...');
    return;
  }

  botLog.info('Getting last messages...');

  const lastMessages = await message.channel.messages.fetch({ limit: 30 });
  lastMessages.reverse();

  botLog.success('Last messages fetched');

  botLog.info('Analyzing last messages to decide if should respond...');
  const wantsToResponseValue = await wantsToResponse(lastMessages);

  if (wantsToResponseValue) {
    botLog.info('Wants to respond');

    message.channel.sendTyping();

    const context: ChatCompletionMessageParam[] = lastMessages.map((lastMessage) => {
      const isBot = lastMessage.author.id === client.user!.id;

      return {
        role: isBot ? 'assistant' : 'user',
        content: isBot ? lastMessage.content : `${lastMessage.author.username}: ${lastMessage.content}`,
      };
    });

    context.push({
      role: 'user',
      content: `${message.author.username}: ${message.content}`,
    });

    const response = await generateResponse(context);

    message.reply(response);
  } else {
    botLog.info('Does not want to respond, ignoring...');
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
