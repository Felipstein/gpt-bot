import chalk from 'chalk';
import { Client, GatewayIntentBits } from 'discord.js';
import { z } from 'zod';

import { Logger } from './logger';

const botBuildSchema = z.object({
  botName: z.string(),
  botDiscriminator: z.string(),
  botId: z.string(),
});

const botTokenSchema = z.string();

export type BotBuilderSchema = z.infer<typeof botBuildSchema>;
export type BotToken = z.infer<typeof botTokenSchema>;

export default class Bot {
  private readonly id: string;

  private readonly discriminator: string;

  private readonly name: string;

  private readonly client: Client;

  private readonly logger;

  constructor(
    options: BotBuilderSchema,
    private readonly token: BotToken,
  ) {
    botTokenSchema.parse(token);

    const { botId: id, botDiscriminator: discriminator, botName: name } = botBuildSchema.parse(options);

    this.id = id;
    this.discriminator = discriminator;
    this.name = name;

    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });

    this.logger = Logger.start(chalk.bgCyanBright, `BOT ${this.name}`);

    this.logger.info(`Bot ${this.name} initialized.`);
  }

  async login() {
    this.logger.pending('Logging in...');

    await this.client.login(this.token);

    this.logger.success(`Logged in as ${this.name}#${this.discriminator}.`);
  }
}
