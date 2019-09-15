/**
 * LogLevel indicates what type of logs should be allowed to run. They are
 * bitwise flags, which are essentially a collection of booleans embedded in the
 * binary value of a number. To enable multiple log levels in a custom
 * configuration, use the bitwise OR operator like so:
 *
 * ```js
 * let levelErrorWarn = LogLevel.Error | LogLevel.Warn;
 * ```
 */
export enum LogLevel {
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
