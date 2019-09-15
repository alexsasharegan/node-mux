import { JSONReplacer, JSONPayload, PlainTextPayload } from "./Renderer";
import { OutgoingHttpHeaders, RequestListener, IncomingMessage, ServerResponse } from "http";
import { StatusCode } from "./status";
import { Renderer, Handler } from "../contracts";

interface BaseResponseParams {
  status?: number;
  headers?: OutgoingHttpHeaders;
}

export interface ResponseParams extends BaseResponseParams {
  payload: Renderer;
}

export class Response implements Handler {
  payload: Renderer;
  status: number;
  headers: OutgoingHttpHeaders;

  constructor({ payload, status = StatusCode.OK, headers = {} }: ResponseParams) {
    this.payload = payload;
    this.status = status;
    this.headers = headers;
  }

  serveHTTP: RequestListener = async (_request, response) => {
    response.statusCode = this.status;

    for (let [name, value] of Object.entries(this.headers)) {
      if (value === undefined) {
        continue;
      }
      response.setHeader(name, value);
    }

    await this.payload.renderPayload(response);

    if (!response.finished) {
      response.end();
    }
  };
}

export interface JSONResponseParams<T> extends BaseResponseParams {
  data: T;
  replacer?: JSONReplacer;
}

export class JSONResponse<T = any> extends Response {
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

export class PlainTextResponse extends Response {
  constructor({ data, headers, status }: PlainTextResponseParams) {
    super({
      headers,
      payload: new PlainTextPayload(data),
      status,
    });
  }
}

export class NotFoundResponse implements Handler {
  async serveHTTP(_request: IncomingMessage, response: ServerResponse) {
    response.statusCode = StatusCode.NotFound;
    response.setHeader("X-Content-Type-Options", "nosniff");
    await new PlainTextPayload(`404 page not found`).renderPayload(response);
  }
}
