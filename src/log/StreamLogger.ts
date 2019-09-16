import util from "util";
import { Logger } from "../contracts";
import { LogLabel, levelSatisfies, LogLevel, NewLine } from "./shared";

export interface ConsoleLoggerOptions {
  stream?: NodeJS.WritableStream;
  newLine?: NewLine;
}

/**
 * ConsoleLogger is an implementation of the Logger interface that just
 * delegates to various `console` methods. It uses methods as arrow function
 * properties so that all callers need not concern themselves with gotchas
 * around managing context for `this`.
 */
export class StreamLogger implements Logger {
  isRoot = true;
  newLine: NewLine;
  wx: NodeJS.WritableStream;

  constructor(protected level: number, options: ConsoleLoggerOptions = {}) {
    let { stream = process.stderr, newLine = NewLine.LF } = options;
    this.wx = stream;
    this.newLine = newLine;
  }

  protected write(label: LogLabel, ...values: any[]) {
    this.wx.write(util.format(this.prefix(label), ...values));
    this.wx.write(this.newLine);
  }

  protected prefix(label: LogLabel): string {
    let d = new Date();

    let YYYY = d.getFullYear();
    let MM = padZero(d.getMonth() + 1);
    let DD = padZero(d.getDate());

    let hh = padZero(d.getHours());
    let mm = padZero(d.getMinutes());
    let ss = padZero(d.getSeconds());

    // log label
    let ll = "";
    switch (label) {
      case LogLabel.Debug:
        ll = "DEBUG ";
        break;
      case LogLabel.Error:
        ll = "ERROR ";
        break;
      case LogLabel.Fatal:
        ll = "FATAL ";
        break;
      case LogLabel.Info:
        ll = "INFO ";
        break;
      case LogLabel.Warn:
        ll = "WARN ";
        break;
    }

    return `${ll}[${YYYY}/${MM}/${DD} ${hh}:${mm}:${ss}]`;
  }

  fatal = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Fatal)) {
      return;
    }

    this.write(LogLabel.Fatal, ...values);

    if (this.isRoot) {
      process.exit(1);
    }
  };

  error = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Error)) {
      return;
    }
    this.write(LogLabel.Error, ...values);
  };

  warn = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Warn)) {
      return;
    }
    this.write(LogLabel.Warn, ...values);
  };

  info = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Info)) {
      return;
    }
    this.write(LogLabel.Info, ...values);
  };

  debug = (...values: any[]) => {
    if (!levelSatisfies(this.level, LogLevel.Debug)) {
      return;
    }
    this.write(LogLabel.Debug, ...values);
  };
}

export function padZero(n: number, padLength = 2): string {
  return n.toString().padStart(padLength, "0");
}
