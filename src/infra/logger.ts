import chalk from 'chalk';

export class Logger {
  private readonly color: chalk.Chalk;

  private readonly context: string;

  private subContext: string | null;

  constructor(color: chalk.Chalk, context: string) {
    this.color = color.bold;
    this.context = context;
    this.subContext = null;
  }

  success(...messages: any[]) {
    console.info(...this.buildMessages(chalk.green, '✔', ...messages));
  }

  pending(...messages: any[]) {
    console.info(...this.buildMessages(chalk.cyan.italic, '⏳', ...messages));
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
    const messagesMapped: any[] = [this.getContext(), ...messages];

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

  private getContext() {
    if (this.subContext) {
      return this.color(` ${this.context}/${this.subContext} `);
    }

    return this.color(` ${this.context} `);
  }

  sub(subContext: string) {
    this.subContext = subContext;
    return this;
  }

  end() {
    this.subContext = null;

    return this;
  }

  static start(color: chalk.Chalk, context: string) {
    return new Logger(color, context);
  }
}
