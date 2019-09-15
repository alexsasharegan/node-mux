import { IncomingMessage, ServerResponse } from "http";

export type HandleFunc = (request: IncomingMessage, response: ServerResponse) => Promise<any>;

/**
 * A Handler responds to an HTTP request.
 *
 * The Handler interface defines an object that implements
 * a RequestListener named `serveHTTP`.
 */
export interface Handler {
  serveHTTP(request: IncomingMessage, response: ServerResponse): Promise<any>;
}

export type RenderPayloadFunc = (response: ServerResponse) => Promise<void>;

/**
 * A Renderer writes a payload to the response.
 *
 * The Renderer interface defines a single method `renderPayload`
 * that is responsible for the following:
 *
 * - setting the `Content-Type` & `Content-Length` headers
 * - writing the response payload
 * - returning a Promise that resolves once the payload write has finished
 */
export interface Renderer {
  renderPayload: RenderPayloadFunc;
}

/**
 * A middleware function.
 */
export type Adapter = (h: Handler) => Handler;

export type AdapterFactory<T> = (init: T) => Adapter;

/**
 * RequestContext contains both the request and the response objects.
 * It is the foundation of any Context interface.
 */
export interface RequestContext {
  request: IncomingMessage;
  response: ServerResponse;
}

// export interface ContextWithLogger {
//   logger: Logger;
// }

// export interface ContextWithStore {
//   store: Map<any, any>;
// }

// export interface ContextWithResponseHelpers {
//   send(responder: Responder): Promise<void>;
// }

// export interface Context extends RequestContext, ContextWithLogger, ContextWithStore {}

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