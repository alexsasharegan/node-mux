import { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { Handler, isHTTPHandler, Request, Response, kDidInit, Adapter } from "./contracts";
import { LogManager, LogLevel, StreamLogger, StructuredLog } from "./log";
import { ServeMux } from "./mux";
import { endResponse } from "./response/helpers";
import { DefaultInternalServerErrorHandler } from "./response";
import { matchMethod } from "./request/methods";

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

  public serveHTTP = async (
    request: Request | IncomingMessage,
    response: Response | ServerResponse
  ) => {
    let [rx, wx] = this.contextualize(request, response);

    await this.execHandler(rx, wx, this.mux);
  };

  public withAdapters(...adapters: Adapter[]): this {
    this.mux.withAdapters(...adapters);
    return this;
  }

  protected async execHandler(rx: Request, wx: Response, h: Handler): Promise<void> {
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
        return this.execHandler(rx, wx, error);
      }

      // If no handler was thrown AND headers are not sent,
      // we can respond with a 500.
      await DefaultInternalServerErrorHandler.serveHTTP(rx, wx);
    }

    // Clean up resources.
    await endResponse(wx);
  }

  protected contextualize(rx: any, wx: any): [Request, Response] {
    if (rx[kDidInit] && wx[kDidInit]) {
      return [rx, wx];
    }

    // Symmetric fields.
    wx.context = rx.context = new Map();
    wx.logger = rx.logger = this.logManager;

    // Request fields.
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

    let cachedGetter: () => NonNullable<Refs> = () => {
      if (refs.parsedUrl != null && refs.query != null) {
        return refs;
      }
      refs.parsedUrl = url.parse((rx as IncomingMessage).url || "");
      refs.query = new URLSearchParams(refs.parsedUrl.search);
      return refs;
    };

    Object.defineProperties(rx, {
      query: {
        get: () => cachedGetter().query,
      },
      parsedUrl: {
        get: () => cachedGetter().parsedUrl,
      },
    });

    // The request/response have now been initialized.
    rx[kDidInit] = wx[kDidInit] = true;

    return [rx, wx];
  }
}
