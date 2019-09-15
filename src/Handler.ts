import { Handler, HandleFunc, Request, Response } from "./contracts";

export class HTTPHandler implements Handler {
  handleFunc: HandleFunc;

  constructor(fn: HandleFunc) {
    this.handleFunc = fn;
  }

  async serveHTTP(rx: Request, wx: Response) {
    await this.handleFunc(rx, wx);
  }
}
