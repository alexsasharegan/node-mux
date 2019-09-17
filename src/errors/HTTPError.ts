import { WrappedError, WrappedErrorParams } from "./WrappedError";
import { Request, Response } from "../contracts";
import { PlainTextResponse, JSONResponse } from "../response";
import { OutgoingHttpHeaders } from "http";

export interface HTTPErrorParams<E> extends WrappedErrorParams<E> {
  code: number;
  message: string;
  headers?: OutgoingHttpHeaders;
}

/**
 * HTTPError constructs an Error type subclassed from WrappedError.
 * It conforms to the Handler interface, so it can be thrown and rendered.
 * It renders the `message` passed as content-type text/plain.
 */
export class HTTPError<E = any> extends WrappedError<E> {
  code: number;
  headers?: OutgoingHttpHeaders;

  constructor({ code, message, previous, headers }: HTTPErrorParams<E>) {
    super(message, { code, previous });
    this.headers = headers;
    this.code = code;
  }

  async serveHTTP(rx: Request, wx: Response) {
    let res = new PlainTextResponse({
      data: this.message,
      status: this.code,
      headers: this.headers,
    });

    await res.serveHTTP(rx, wx);
  }
}

export interface JSONErrorParams<E> extends HTTPErrorParams<E> {
  data?: any;
}

/**
 * JSONError constructs an Error type subclassed from WrappedError.
 * It conforms to the Handler interface, so it can be thrown and rendered.
 *
 * If custom `data` is not passed to the constructor, an object is created
 * with the field `message` using the error message.
 */
export class JSONError<E = any> extends HTTPError<E> {
  data: any;

  constructor({ code, data, message, previous, headers }: JSONErrorParams<E>) {
    super({ message, code, previous, headers });
    if (!data) {
      data = { message };
    }

    this.data = data;
  }

  async serveHTTP(rx: Request, wx: Response) {
    let res = new JSONResponse({
      data: this.data,
      status: this.code,
      headers: this.headers,
    });

    await res.serveHTTP(rx, wx);
  }
}
