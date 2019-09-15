import { JSONReplacer, JSONPayload, PlainTextPayload } from "./Renderer";
import { OutgoingHttpHeaders } from "http";
import { StatusCode } from "./status";
import {
  Request,
  Response,
  ResponseWriter,
  Handler,
  HandleFunc,
  RequestContext,
} from "../contracts";
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

  serveHTTP: HandleFunc = async (_request, response) => {
    response.statusCode = this.status;

    for (let [name, value] of Object.entries(this.headers)) {
      if (value === undefined) {
        continue;
      }
      response.setHeader(name, value);
    }

    await this.payload.writeResponse(response);

    if (!response.finished) {
      response.end();
    }
  };
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
    await new PlainTextPayload(`404 page not found`).writeResponse(wx);
  },
};

export const DefaultInternalServerErrorHandler: Handler = {
  async serveHTTP(_, wx) {
    wx.statusCode = StatusCode.InternalServerError;
    await new PlainTextPayload(`500 internal server error`).writeResponse(wx);
  },
};

export const DefaultRequestTimeoutHandler: Handler = {
  async serveHTTP(_, wx) {
    wx.statusCode = StatusCode.RequestTimeout;
    await new PlainTextPayload(`408 request timeout`).writeResponse(wx);
  },
};

export class RedirectHandler implements Handler {
  url: string;
  code: number;
  constructor(params: { url: string; code: number }) {
    this.code = params.code;
    this.url = params.url;
  }

  async serveHTTP(request: Request, response: Response) {
    RedirectHandler.redirect({ request, response, code: this.code, url: this.url });
    await endResponse(response);
  }

  static redirect(params: RequestContext & { url: string; code: number }) {
    let { code, response, url } = params;

    response.setHeader("Location", url);
    response.statusCode = code;
  }
}
