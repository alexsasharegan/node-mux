import { IncomingMessage, ServerResponse } from "http";
import { UrlWithStringQuery } from "url";

export const kDidInit: unique symbol = Symbol("node-mux:initialized");

export interface Request extends IncomingMessage, MuxRequest {}

interface MuxRequest {
  /**
   * Used by the root Application to initialize the request/response objects.
   */
  [kDidInit]: true;
  /**
   * A place to put your stuff.
   */
  store: Map<any, any>;
  /**
   * An application logger.
   */
  logger: Logger;
  /**
   * The verified url string.
   */
  xUrl: string;
  /**
   * The verified, normalized request method.
   *
   * Since the method property is shared across IncomingMessages,
   * it's normally nullable. Since this runs in an HTTP context,
   * we can verify and upgrade the original method type.
   */
  xMethod: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE";
  body: null | any;
  /**
   * Retrieves the parsed request body.
   * If the body has not been parsed and this is called,
   * an error is thrown.
   */
  mustBody(): Record<string, any>;
  /**
   * Once a BodyReader has read the request body,
   * it must set this flag to true to ensure no other readers consume it.
   */
  bodyConsumed: boolean;
  /**
   * The parsed original url.
   * Parsed lazily (upon access).
   */
  parsedUrl: UrlWithStringQuery;
  /**
   * The parsed query string.
   * Parsed lazily (upon access).
   */
  query: URLSearchParams;
}

export interface Response extends ServerResponse, MuxResponse {}

interface MuxResponse {
  /**
   * Used by the root Application to initialize the request/response objects.
   */
  [kDidInit]: true;
  /**
   * A place to put your stuff.
   */
  store: Map<any, any>;
  /**
   * An application logger.
   */
  logger: Logger;
  /**
   * A convenience function to run a Handler to completion.
   * This can be useful when functions return Handlers
   * that you want to send without the ceremony
   * of invoking their `serveHTTP` method.
   */
  send(h: Handler): Promise<void>;
}

export type HandleFunc = (request: Request, response: Response) => Promise<any>;

/**
 * A Handler responds to an HTTP request.
 *
 * The Handler interface defines an object that implements
 * a RequestListener named `serveHTTP`.
 */
export interface Handler {
  serveHTTP(request: Request, response: Response): Promise<any>;
}

export function isHTTPHandler(x: any): x is Handler {
  return x != null && typeof x.serveHTTP === "function";
}

export type ResponseWriterFunc = (response: Response) => Promise<void>;

/**
 * A ResponseWriter writes a payload to the response.
 *
 * The ResponseWriter interface defines a single method `writeResponse`
 * that is responsible for the following:
 *
 * - setting the `Content-Type` & `Content-Length` headers
 * - writing the response payload
 * - returning a Promise that resolves once the payload write has finished
 */
export interface ResponseWriter {
  writeResponse: ResponseWriterFunc;
}

/**
 * AdapterFunc adapts, or decorates, the original handler
 * and returns a new handler. This allows middleware to operate
 * before and after the handler responds.
 *
 * It is expected that the returned handler calls the original handler,
 * except in cases where the new handler responds first--like short-circuiting
 * the request on error and responding.
 */
export type AdapterFunc = (h: Handler) => Handler;

export interface Adapter {
  adapt: AdapterFunc;
}

/**
 * RequestContext contains both the request and the response objects.
 */
export interface RequestContext {
  request: Request;
  response: Response;
}

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
