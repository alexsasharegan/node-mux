import { OutgoingHttpHeaders } from "http";
import { Request, Response, ResponseWriter, Handler } from "../contracts";
import { JSONReplacer, JSONPayload, PlainTextPayload } from "./ResponseWriter";
import { StatusCode } from "./status";
import { endResponse } from "./helpers";

interface BaseResponseParams {
  status?: number;
  headers?: OutgoingHttpHeaders;
}

export interface ResponseParams extends BaseResponseParams {
  payload: ResponseWriter;
}

export class HTTPResponse implements Handler {
  payload: ResponseWriter;
  status: number;
  headers: OutgoingHttpHeaders;

  constructor({ payload, status = StatusCode.OK, headers = {} }: ResponseParams) {
    this.payload = payload;
    this.status = status;
    this.headers = headers;
  }

  async serveHTTP(_: Request, wx: Response) {
    wx.statusCode = this.status;

    for (let [name, value] of Object.entries(this.headers)) {
      if (value === undefined) {
        continue;
      }
      wx.setHeader(name, value);
    }

    await this.payload.writeResponse(wx);

    if (!wx.finished) {
      await endResponse(wx);
    }
  }
}

export interface JSONResponseParams<T> extends BaseResponseParams {
  data: T;
  replacer?: JSONReplacer;
}

export class JSONResponse<T = any> extends HTTPResponse {
  constructor({ data, headers, replacer, status }: JSONResponseParams<T>) {
    super({
      headers,
      payload: new JSONPayload(data, { replacer }),
      status,
    });
  }
}

export interface PlainTextResponseParams extends BaseResponseParams {
  data: string;
}

export class PlainTextResponse extends HTTPResponse {
  constructor({ data, headers, status }: PlainTextResponseParams) {
    super({
      headers,
      payload: new PlainTextPayload(data),
      status,
    });
  }
}

export const DefaultNotFoundHandler: Handler = {
  async serveHTTP(_, wx) {
    wx.statusCode = StatusCode.NotFound;
    wx.setHeader("X-Content-Type-Options", "nosniff");
    let payload = new JSONPayload({ message: `404 page not found` });
    await payload.writeResponse(wx);
  },
};

export const DefaultInternalServerErrorHandler: Handler = {
  async serveHTTP(_, wx) {
    wx.statusCode = StatusCode.InternalServerError;
    let payload = new JSONPayload({ message: `500 internal server error` });
    await payload.writeResponse(wx);
  },
};

export const DefaultRequestTimeoutHandler: Handler = {
  async serveHTTP(_, wx) {
    wx.statusCode = StatusCode.RequestTimeout;
    let payload = new JSONPayload({ message: `408 request timeout` });
    await payload.writeResponse(wx);
  },
};

export class RedirectHandler implements Handler {
  url: string;
  code: number;
  constructor(params: { url: string; code: number }) {
    this.code = params.code;
    this.url = params.url;
  }

  async serveHTTP(_: Request, wx: Response) {
    await RedirectHandler.redirect(wx, { code: this.code, url: this.url });
  }

  static async redirect(wx: Response, params: { url: string; code: number }) {
    let { code, url } = params;

    wx.setHeader("Location", url);
    wx.statusCode = code;
    await endResponse(wx);
  }
}
