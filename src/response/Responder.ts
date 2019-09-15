import { Context } from "../Context";
import { Renderer, JSONReplacer, JSONPayload } from "./Renderer";
import { OutgoingHttpHeaders } from "http";
import { StatusCode } from "./status";

/**
 * The Responder interface defines a single method `respondHTTP`
 * that is responsible for the following:
 *
 * - setting a status code
 * - sending headers
 * - sending a payload
 */
export interface Responder {
  respondHTTP(ctx: Context): Promise<any>;
}

interface BaseResponseParams {
  status?: number;
  headers?: OutgoingHttpHeaders;
}

export interface ResponseParams extends BaseResponseParams {
  payload: Renderer;
}

export class Response implements Responder {
  payload: Renderer;
  status: number;
  headers: OutgoingHttpHeaders;

  constructor({ payload, status = StatusCode.OK, headers = {} }: ResponseParams) {
    this.payload = payload;
    this.status = status;
    this.headers = headers;
  }

  respondHTTP = async (ctx: Context) => {
    ctx.response.statusCode = this.status;

    for (let [name, value] of Object.entries(this.headers)) {
      if (value === undefined) {
        continue;
      }
      ctx.response.setHeader(name, value);
    }

    await this.payload.renderPayload(ctx);
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

export function isResponder(x: any): x is Responder {
  if (x == null) {
    return false;
  }

  if (typeof x.respondHTTP !== "function") {
    return false;
  }

  // The method arity is 1.
  if (x.respondHTTP.length !== 1) {
    return false;
  }

  return true;
}
