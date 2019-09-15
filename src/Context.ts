import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "./log";
import { isResponder, Responder } from "./response";

/**
 * RequestContext contains both the request and the response objects.
 * It is the foundation of any Context interface.
 */
export interface RequestContext {
  request: IncomingMessage;
  response: ServerResponse;
}

export interface ContextWithLogger {
  logger: Logger;
}
export interface ContextWithStore {
  store: Map<any, any>;
}

export interface ContextWithResponseHelpers {
  send(responder: Responder): Promise<void>;
}

export interface Context
  extends RequestContext,
    ContextWithLogger,
    ContextWithStore,
    ContextWithResponseHelpers {}

export interface ServerContextOptions extends RequestContext {
  logger: Logger;
}

export class ServerContext implements Context {
  public request: IncomingMessage;
  public response: ServerResponse;
  public logger: Logger;
  public store = new Map<any, any>();

  constructor({ logger, request, response }: ServerContextOptions) {
    this.logger = logger;
    this.request = request;
    this.response = response;
  }

  send = async (responder: Responder) => {
    try {
      await responder.respondHTTP(this);
    } catch (error) {
      this.logger.error(error);

      // If we try to render the response and everything fails,
      // we can only change our response if the headers haven't been sent yet.
      if (this.response.headersSent) {
        // Headers sent means we just need to bail and clean up.
        this.response.end();
        return;
      }

      // A Responder can be thrown to provide custom responses.
      if (isResponder(error)) {
        await this.send(error);
      }
    }

    if (!this.response.finished) {
      this.response.end();
    }
  };
}
