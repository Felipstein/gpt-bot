import './env';

import { joinVoiceChannel } from '@discordjs/voice';
import chalk from 'chalk';
import { ChannelType, Client, GatewayIntentBits } from 'discord.js';
import { ChatCompletionMessageParam } from 'openai/resources';

import { constants } from './constants';
import { generateResponse, wantsToResponse } from './gpt';
import { Logger } from './logger';

const botLog = Logger.start(chalk.bgCyan.bold, 'BOT');

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let voiceConnectionClient: ReturnType<typeof joinVoiceChannel> | null = null;

export const botFunctions = {
  getUsersDescription({ username }: { username?: string }) {
    const users = {
      farred: {
        otherNames: ['far', 'farredo'],
        id: '392031985620746242',
        description:
          'administrador de tudo, manda em tudo, ele é até tirânico, ele também adora física, explicar tudo, etc...',
      },
      iceseconds: {
        otherNames: ['ice', 'samuel', 'geraldin'],
        id: '356099807023988736',
        description:
          'um cara bacana, todo mundo chama ele de geraldin. Ele sempre consegue os links de todos os jogos que você pedir. Ah, ele é moderador',
      },
      pieba: {
        otherNames: ['zpiebis', 'mana', 'piebis', 'biinhadm'],
        id: '415984743964868620',
        description: 'a mana, a melhor moderadora do servidor (por mais que é homem)',
      },
      lion: {
        otherNames: ['elleno', 'liaun', 'liaum', 'luis', 'f', 'felipe'],
        id: '987105916803514428',
        description: 'o meu criador, ele também é moderador, e muito legal, acho que ele é o mais legal de todos',
      },
      sammy: {
        otherNames: ['sammycm'],
        id: '279651433870262272',
        description:
          'Moderadora muito legal, ela adora aparecer de noite por que acorda só depois das 5 horas da tarde. Cuidado, o cherry está de olho, ele tem muito ciumes',
      },
      dublador: {
        id: '741628465748377630',
        description: 'a safadinha de todos, o mais burrinho',
      },
      doutor: {
        id: '1176988936141283479',
        description: 'o meu maior inimigo, o bot que eu quero tirar do servidor',
      },
      joao: {
        id: '691721967467757588',
        description: 'Apaixonado pela endy, quer dar até o brioco pra ela',
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

  async joinCall({ channelId }: { channelId: string }) {
    try {
      botLog.info(`Fetching channel ${channelId} id`);

      const channel = await client.channels.fetch(channelId);

      if (!channel) {
        botLog.error('Channel not found');
        const response = {
          error: true,
          reason: 'Canal não encontrado',
        };

        return JSON.stringify(response);
      }

      if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
        botLog.error('Channel is not voice channel');
        const response = {
          error: true,
          reason: 'Canal nao é um canal de voz',
        };

        return JSON.stringify(response);
      }

      botLog.success('Channel found');

      voiceConnectionClient = joinVoiceChannel({
        channelId,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      botLog.info('Call joined');

      const response = {
        error: false,
      };

      return JSON.stringify(response);
    } catch (err: unknown) {
      if (err instanceof Error) {
        const response = {
          error: true,
          reason: err.message,
        };

        return JSON.stringify(response);
      }

      const response = {
        error: true,
        reason: 'Ocorreu um erro desconhecido',
      };

      return JSON.stringify(response);
    }
  },

  leaveCall() {
    if (voiceConnectionClient) {
      botLog.info('Leaving call');

      voiceConnectionClient.destroy();
      voiceConnectionClient = null;

      botLog.info('Call left');

      const response = {
        error: false,
      };

      return JSON.stringify(response);
    }

    const response = {
      error: true,
      reason: 'Não existe uma chamada em andamento',
    };

    return JSON.stringify(response);
  },
};

client.once('ready', async () => {
  botLog.info(`Bot connected with profile ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.discriminator === constants.botDiscriminator) {
    return;
  }

  // if (message.author.bot) {
  //   return;
  // }

  if (message.channelId !== '1176987500636541069') {
    botLog.warn('Incorrect chat, ignoring...');
    return;
  }

  // if (message.channelId !== '1177255469388157038') {
  //   botLog.warn('Incorrect chat, ignoring...');
  //   return;
  // }

  botLog.info('Getting last messages...');

  const lastMessages = await message.channel.messages.fetch({ limit: 30 });
  lastMessages.reverse();

  botLog.success('Last messages fetched');

  botLog.info('Analyzing last messages to decide if should respond...');

  const wantsToResponseValue = await wantsToResponse(lastMessages, {
    username: message.author.username,
    message: message.content,
  });

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
