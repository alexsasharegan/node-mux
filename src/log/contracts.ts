/**
 * Logger serves as an application abstraction that should allow for different
 * environments (like development vs. production) to swap out logging.
 * A production environment might choose to use an error tracking service and/or
 * a structured logger for indexable logs, while development may suffice with
 * calls delegated to `console.log`.
 */
export interface Logger {
  /**
   * Since Loggers compose together like trees,
   * some behavior is augmented for the root logger vs. the leaf loggers.
   */
  isRoot: boolean;
  /**
   * `fatal` logs a message, then terminates execution with an error exit code.
   * Ideally used only in development to kill the process at a given point, it
   * may also be used in production to ensure an invariant cannot exist
   * (i.e. exit if you hit a supposedly impossible state).
   *
   * Only the root logger should implement process exiting.
   */
  fatal(...values: any[]): void;
  /**
   * `error` logs error level values.
   */
  error(...values: any[]): void;
  /**
   * `warn` logs warning level values.
   */
  warn(...values: any[]): void;
  /**
   * `info` logs informational level values. Info and debug can be harder to
   * distinguish, but an info log would be something like the resolved port
   * the server starts on, or a runtime config path used, not something like
   * values from the response body.
   */
  info(...values: any[]): void;
  /**
   * `debug` logs debug level values. These are DEVELOPMENT ONLY level values.
   * Production log levels should NOT include this level for fear of leaking
   * sensitive application data into logs.
   */
  debug(...values: any[]): void;
}

/**
   * LogLevel indicates what type of logs should be allowed to run. They are
   * bitwise flags, which are essentially a collection of booleans embedded in the
   * binary value of a number. To enable multiple log levels in a custom
   * configuration, use the bitwise OR operator like so:
   *
   * ```js
  let levelErrorWarn = LogLevel.Error | LogLevel.Warn;
  ```
   */
export const enum LogLevel {
  /**
   * No logging allowed.
   */
  None = 0,
  /**
   * Enable fatal log and exit behavior.
   */
  Fatal = 1 << 0,
  /**
   * Enable error level messages to be logged.
   */
  Error = 1 << 1,
  /**
   * Enable warning level messages to be logged.
   */
  Warn = 1 << 2,
  /**
   * Enable informational level messages to be logged.
   */
  Info = 1 << 3,
  /**
   * Enable debugging level messages to be logged.
   * Should be used in DEVELOPMENT ONLY.
   */
  Debug = 1 << 4,

  /**
   * Convenient shortcut to enable all log levels.
   * Should be used in DEVELOPMENT ONLY.
   */
  All = LogLevel.Fatal | LogLevel.Error | LogLevel.Warn | LogLevel.Info | LogLevel.Debug,
}

export const enum LogLabel {
  Fatal = "fatal",
  Error = "error",
  Warn = "warn",
  Info = "info",
  Debug = "debug",
}

/**
 * Implements the boolean logic to extract and compare logging levels.
 * `level` is the level set at runtime, while `target` is the level of the
 * logging being requested (e.g. `error` or `debug`).
 */
export function levelSatisfies(level: number, target: number): boolean {
  return (level & target) === target;
}
