import chalk from 'chalk';

export class Logger {
  private readonly context: string;

  constructor(color: chalk.Chalk, context: string) {
    this.context = color.bold(` ${context} `);
  }

  success(...messages: any[]) {
    console.info(...this.buildMessages(chalk.green, '✔', ...messages));
  }

  info(...messages: any[]) {
    console.info(...this.buildMessages(null, ...messages));
  }

  warn(...messages: any[]) {
    console.warn(...this.buildMessages(chalk.yellow, '⚠', ...messages));
  }

  error(...messages: any[]) {
    console.error(...this.buildMessages(chalk.red, '✖', ...messages));
  }

  json(obj: object) {
    console.info(...this.buildMessages(null, obj));
  }

  private buildMessages(color: chalk.Chalk | null = null, ...messages: any[]) {
    const messagesMapped: any[] = [this.context, ...messages];

    if (!color) {
      return messagesMapped;
    }

    return messagesMapped.map((message, index) => {
      if (index === 0) {
        return message;
      }

      if (typeof message === 'string') {
        return color(message);
      }

      if (message instanceof Error) {
        return message;
      }

      if (typeof message === 'object') {
        return JSON.stringify(message, null, 2);
      }

      return message;
    });
  }

  static start(color: chalk.Chalk, context: string) {
    return new Logger(color, context);
  }
}
