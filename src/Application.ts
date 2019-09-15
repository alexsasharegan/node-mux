import { Handler, HandleFunc, RequestContext, isHTTPHandler, Request, Response } from "./contracts";
import { LogManager, LogLevel, StreamLogger, StructuredLog } from "./log";
import { ServeMux } from "./mux";
import { endResponse } from "./response/helpers";
import { DefaultInternalServerErrorHandler } from "./response";

export interface ApplicationOptions {
  logManager?: LogManager;
}

export class Application implements Handler {
  logManager: LogManager;
  mux = new ServeMux();

  constructor({ logManager }: ApplicationOptions = {}) {
    if (!logManager) {
      logManager = new LogManager(LogLevel.All, new StreamLogger(LogLevel.All));
    }
    this.logManager = logManager;
  }

  serveHTTP: HandleFunc = async (rx, wx) => {
    this.addContext({ request: rx, response: wx });

    this.execHandler(rx, wx, this.mux);
  };

  protected async execHandler(rx: Request, wx: Response, h: Handler) {
    try {
      await h.serveHTTP(rx, wx);
    } catch (error) {
      this.logManager.error(new StructuredLog(error));

      // With headers already sent, we can't send a 500.
      if (wx.headersSent) {
        // Clean up and exit this request's lifecycle.
        await endResponse(wx);
        return;
      }

      // If a handler was thrown, so we'll execute the handler.
      if (isHTTPHandler(error)) {
        this.execHandler(rx, wx, error);
        return;
      }

      // If no handler was thrown AND headers are not sent,
      // we can respond with a 500.
      await DefaultInternalServerErrorHandler.serveHTTP(rx, wx);
    }

    // Clean up resources.
    await endResponse(wx);
  }

  protected addContext({ request: rx, response: wx }: RequestContext) {
    wx.context = rx.context = new Map();
    wx.logger = rx.logger = this.logManager;
  }
}
