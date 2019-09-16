import { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { Handler, isHTTPHandler, Request, Response, kDidInit, Adapter } from "./contracts";
import { LogManager, LogLevel, StreamLogger, StructuredLog } from "./log";
import { Router } from "./mux";
import { endResponse } from "./response/helpers";
import { DefaultInternalServerErrorHandler } from "./response";
import { matchMethod } from "./request";

export interface ApplicationOptions {
  logManager?: LogManager;
}

export class Application implements Handler {
  logManager: LogManager;
  router = new Router("/");

  constructor({ logManager }: ApplicationOptions = {}) {
    if (!logManager) {
      logManager = new LogManager(LogLevel.All, new StreamLogger(LogLevel.All));
    }
    this.logManager = logManager;
  }

  public serveHTTP = async (
    request: Request | IncomingMessage,
    response: Response | ServerResponse
  ) => {
    let [rx, wx] = this.contextualize(request, response);

    await this.execHandler(rx, wx, this.router);
    await this.close(rx, wx);
  };

  public useAdapters(...adapters: Adapter[]): this {
    this.router.useAdapters(...adapters);
    return this;
  }

  protected async close(rx: Request, wx: Response) {
    // Clean up resources.
    await endResponse(wx);
    rx.unpipe();
  }

  /**
   * execHandler is responsible for running a Handler and recovering from failure.
   *
   * - When a failure occurs and a Handler is caught, try running the Handler (recursive).
   * - When a failure occurs and isn't a Handler, log it.
   * - When a failure occurs and headers are sent, ensure any error is logged
   *   and return immediately.
   * - When a failure occurs and no Handler is available, serve a 500.
   */
  protected async execHandler(rx: Request, wx: Response, h: Handler): Promise<void> {
    try {
      await h.serveHTTP(rx, wx);
    } catch (error) {
      let isHandlerError = isHTTPHandler(error);

      // Don't log an intentionally thrown Handler.
      if (!isHandlerError) {
        this.logManager.error(new StructuredLog(error));
      }

      // With headers already sent, we can't recover the response.
      if (wx.headersSent) {
        // Since we skipped logging the Handler earlier,
        // but it is now known to be unusable,
        // recover logging the error.
        if (isHandlerError) {
          this.logManager.error(new StructuredLog(error));
        }
        return;
      }

      // If a handler was thrown, so we'll execute the handler.
      if (isHandlerError) {
        return this.execHandler(rx, wx, error);
      }

      // If no handler was thrown AND headers are not sent,
      // we can respond with a 500.
      await DefaultInternalServerErrorHandler.serveHTTP(rx, wx);
    }
  }

  protected contextualize(request: IncomingMessage, response: ServerResponse): [Request, Response] {
    // @ts-unsafe bypass type checks here while we do the type upgrade dirty work.
    let rx: any = request;
    let wx: any = response;

    // Don't allow the request/response to be initialized twice.
    if (rx[kDidInit] && wx[kDidInit]) {
      return [rx, wx];
    }

    // Symmetric fields.
    // -------------------------------------------------------------------------
    wx.store = rx.store = new Map();
    wx.logger = rx.logger = this.logManager;

    // Request fields.
    // -------------------------------------------------------------------------
    rx.xUrl = rx.url || "";
    rx.xMethod = matchMethod(rx.method || "");
    rx.body = null;
    rx.bodyConsumed = false;
    rx.mustBody = function mustBody() {
      if (rx.body == null) {
        throw new TypeError(`The request body is empty. It has not yet been parsed.`);
      }

      return rx.body;
    };

    // Response fields.
    // -------------------------------------------------------------------------
    wx.send = async function send(h: Handler) {
      await h.serveHTTP(rx, wx);
    };

    type Refs = {
      parsedUrl: url.UrlWithStringQuery | null;
      query: URLSearchParams | null;
    };
    let refs: Refs = {
      parsedUrl: null,
      query: null,
    };

    let getRefs: () => NonNullable<Refs> = () => {
      if (refs.parsedUrl != null && refs.query != null) {
        return refs;
      }
      refs.parsedUrl = url.parse((rx as IncomingMessage).url || "");
      refs.query = new URLSearchParams(refs.parsedUrl.search);
      return refs;
    };

    // Lazily parsed url fields
    Object.defineProperties(rx, {
      query: {
        get: () => getRefs().query,
      },
      parsedUrl: {
        get: () => getRefs().parsedUrl,
      },
    });

    // The request/response have now been initialized.
    // -------------------------------------------------------------------------
    rx[kDidInit] = wx[kDidInit] = true;

    return [rx, wx];
  }
}
