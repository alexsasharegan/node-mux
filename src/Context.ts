import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "./log";
import { isResponder } from "./response";
import { Application } from "./Application";
import {
  Responder,
  RequestContext,
  ContextWithLogger,
  ContextWithStore,
  ContextWithResponseHelpers,
  RespondHTTPFunc,
} from "./contracts";

export interface ContextWithApp<App extends Application = Application>
  extends ContextWithLogger,
    ContextWithStore,
    ContextWithResponseHelpers {
  app: App;
}

export interface ServerContextOptions<App extends Application = Application>
  extends RequestContext,
    ContextWithApp<App> {
  logger: Logger;
}

export class ServerContext<App extends Application = Application> implements ContextWithApp<App> {
  public app: App;
  public request: IncomingMessage;
  public response: ServerResponse;
  public logger: Logger;
  public store = new Map<any, any>();
  public respondHTTP: RespondHTTPFunc;

  constructor({ app, logger, request, response }: ServerContextOptions<App>) {
    this.app = app;
    this.logger = logger;
    this.request = request;
    this.response = response;
    this.respondHTTP = async (ctx) => app.serveHTTP(ctx.request, ctx.response);
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
