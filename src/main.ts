import Bot, { BotBuilderSchema } from './infra/bot';
import './infra/env';

async function main() {
  const options: BotBuilderSchema = {
    botName: 'Professor',
    botDiscriminator: '9571',
    botId: '1177253812117966858',
  };

  const bot = new Bot(options, process.env.DISCORD_BOT_TOKEN);

  await bot.login();
}

main();
