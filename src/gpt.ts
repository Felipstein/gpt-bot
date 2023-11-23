import chalk from 'chalk';
import { Collection, Message } from 'discord.js';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

import { botFunctions, client } from './bot';
import { constants } from './constants';
import { Logger } from './logger';
import { prompts } from './prompts';

const gptLog = Logger.start(chalk.bgGreenBright.bold, 'CHATGPT/CORE');

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

gptLog.info('ChatGPT initialized');

export async function wantsToResponse(
  lastMessages: Collection<string, Message<boolean>>,
  messageReceived: { username: string; message: string },
) {
  const context: ChatCompletionMessageParam[] = lastMessages.map((lastMessage) => {
    const isBot = client.user!.id === lastMessage.author.id;

    return {
      role: isBot ? 'assistant' : 'user',
      content: isBot ? lastMessage.content : `${lastMessage.author.username}: ${lastMessage.content}`,
    };
  });

  context.push({ role: 'user', content: `${messageReceived.username}: ${messageReceived.message}` });

  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-1106',
    messages: [
      {
        role: 'system',
        content: `Você recebeu uma mensagem. Analise o contexto (na qual são nada mais nada menos que as últimas mensagens do chat) e verifique se você deve responder a conversa ou não...

          Você deve analisar as últimas mensagens enviadas e decidir se deve responder a última mensagem enviada, pois talvez a mensagem esteja sendo redirecionada para você, seja pelo contexto ou por que mencionaram seu nome, que é ${
            constants.botName
          }, ou então quando mencionarem seu ID, que é ${constants.botId}.

          Segue exemplos de que você não deveria responder:
          '''
          bom dia far, tudo bem?
          '''

          Segue exemplos de que você deve responder:
          '''
          fala ${constants.botName.toLowerCase()}
          bom dia pra todo mundo!
          eu quero que todo mundo me responda
          hoje é meu aniversário!
          '''

          Segue exemplos que você até pode responder caso queira descontrair:
          '''
          eita rapaiz, ganhei um prêmio no genshin
          '''

          Você deve responder em JSON, com o campo "wantsToResponse", e o valor deverá ser "true" para caso você deve responder ou "false" para caso não. Também deve responder no campo "reason" o motivo do por que aquele valor. Por exemplo: { "wantsToResponse": true, "reason": "Me mencionaram" }`,
      },
      ...context,
    ],
    response_format: { type: 'json_object' },
  });

  const response = gptResponse.choices[0].message.content;

  if (!response) {
    gptLog.error('No response from GPT');

    return false;
  }

  const { wantsToResponse: wantsToResponseValue, reason } = JSON.parse(response);

  gptLog.info('Wants to Response Reason:', reason);

  return wantsToResponseValue as boolean;
}

export async function generateResponse(context: ChatCompletionMessageParam[]) {
  try {
    gptLog.info('Asking to GPT...');

    const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: prompts.context }, ...context];

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'getUsersDescription',
            description:
              'Encontra descrições e outros nomes conhecidos de alguns ou todos os usuários conhecidos/famosos do servidor.',
            parameters: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description:
                    'Nome do usuários para buscar descrições e informações. O campo é opcional, caso não seja providenciado, será retornado as informações de todos os usuários conhecidos',
                },
              },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'joinCall',
            description:
              'Conecte-se à um canal de voz do servidor. Você pode providenciar o id do canal de voz ou, caso não tiver o id do canal de voz, você pode providenciar o id do usuário que chamou você para se conectar',
            parameters: {
              type: 'object',
              properties: {
                channelId: {
                  type: 'string',
                  description: 'ID do canal de voz para se conectar',
                },
                userId: {
                  type: 'string',
                  description: 'ID do usuário que chamou você para se conectar',
                },
              },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'leaveCall',
            description: 'Desconecte-se do canal de voz do servidor.',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        },
      ],
    });

    gptLog.success('GPT responded');

    const choice = gptResponse.choices[0];

    gptLog.info(choice);

    if (choice.message.tool_calls) {
      gptLog.info(`Found ${choice.message.tool_calls.length} tool calls`);
      gptLog.info(choice.message.tool_calls);

      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;

        // @ts-ignore
        const functionToCall = botFunctions[functionName];

        const functionArgs = JSON.parse(toolCall.function.arguments);

        // eslint-disable-next-line no-await-in-loop
        const functionResponse = await functionToCall(functionArgs);

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: functionResponse,
        });
      }

      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages,
      });

      const secondChoice = secondResponse.choices[0];

      gptLog.info(secondChoice);

      return secondChoice.message.content ?? 'Desculpe, não consegui processar isso :(... ';
    }
    gptLog.info('No tool calls, returning message content.');

    const message = choice.message.content?.trim();
    return message ?? 'Desculpe, não consegui processar isso :(... ';
  } catch (error: unknown) {
    gptLog.error(error);

    if (error instanceof Error) {
      return `Desculpe, não consegui processar isso :(... ${error.message}`;
    }
    return `Desculpe, não consegui processar isso :(... `;
  }
}
