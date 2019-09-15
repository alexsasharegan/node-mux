import { WrappedError } from "./WrappedError";
import { Request, Response } from "../contracts";
import { PlainTextResponse, JSONResponse } from "../response";

export class HTTPError<E = any> extends WrappedError<E> {
  code!: number;

  constructor({ code, message, previous }: { message: string; code: number; previous?: E }) {
    super(message, { code, previous });
  }

  async serveHTTP(rx: Request, wx: Response) {
    let res = new PlainTextResponse({
      data: this.message,
      status: this.code,
    });

    await res.serveHTTP(rx, wx);
  }
}

export class JSONError<E = any> extends HTTPError<E> {
  data: any;

  constructor({
    code,
    data,
    message,
    previous,
  }: {
    message: string;
    data?: any;
    code: number;
    previous?: E;
  }) {
    super({ message, code, previous });
    if (!data) {
      data = { message };
    }

    this.data = data;
  }

  async serveHTTP(rx: Request, wx: Response) {
    let res = new JSONResponse({
      data: this.data,
      status: this.code,
    });

    await res.serveHTTP(rx, wx);
  }
}
