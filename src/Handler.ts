import { Handler, HandleFunc, Request, Response } from "./contracts";

export class HTTPHandler implements Handler {
  handleFunc: HandleFunc;

  constructor(f: HandleFunc) {
    this.handleFunc = f;
  }

  async serveHTTP(rx: Request, wx: Response) {
    await this.handleFunc(rx, wx);
  }
}
