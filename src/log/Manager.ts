import { Logger } from "../contracts";
import { levelSatisfies, LogLevel } from "./shared";

/**
 * LogManager wraps any number of logging implementations.
 * It dispatch calls to each logger, provided the manager's level satisfies.
 * This allows for logging to process stderr while also sending errors to an
 * error tracking service like sentry.io--each managing their own internal
 * log levels, but governed by the LogManager's log level.
 */
export class LogManager implements Logger {
  isRoot = true;
  loggers: Logger[] = [];

  constructor(protected level: number, ...loggers: Logger[]) {
    for (let l of loggers) {
      this.add(l);
    }
  }

  add(logger: Logger): this {
    logger.isRoot = false;
    this.loggers.push(logger);
    return this;
  }

  setLevel(level: number): this {
    this.level = level;
    return this;
  }

  fatal = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Fatal)) {
      return;
    }

    for (let l of this.loggers) {
      l.fatal(...values);
    }

    if (this.isRoot) {
      process.exit(1);
    }
  };

  error = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Fatal)) {
      return;
    }

    for (let l of this.loggers) {
      l.error(...values);
    }
  };

  warn = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Fatal)) {
      return;
    }

    for (let l of this.loggers) {
      l.warn(...values);
    }
  };

  info = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Fatal)) {
      return;
    }

    for (let l of this.loggers) {
      l.info(...values);
    }
  };

  debug = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Fatal)) {
      return;
    }

    for (let l of this.loggers) {
      l.debug(...values);
    }
  };
}
