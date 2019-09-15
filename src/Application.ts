import { RequestListener } from "http";
import { ServerContext, RequestContext } from "./Context";
import { Handler } from "./contracts";
import { LogManager, LogLevel, StreamLogger } from "./log";

export interface ApplicationOptions {
  logManager?: LogManager;
}

export class Application implements Handler {
  logManager: LogManager;

  constructor({ logManager }: ApplicationOptions = {}) {
    if (!logManager) {
      logManager = new LogManager(LogLevel.All, new StreamLogger(LogLevel.All));
    }
    this.logManager = logManager;
  }

  serveHTTP: RequestListener = async (request, response) => {
    let ctx = this.createContext({ request, response });

    ctx.send({
      async respondHTTP(ctx) {
        ctx.response.end();
      },
    });
  };

  protected createContext({ request, response }: RequestContext): ServerContext<this> {
    return new ServerContext({
      app: this,
      logger: this.logManager,
      request,
      response,
    });
  }
}
