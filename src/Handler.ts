import { Handler, HandleFunc } from "./contracts";
import { IncomingMessage, ServerResponse } from "http";

export class HTTPHandler implements Handler {
  handleFunc: HandleFunc;

  constructor(fn: HandleFunc) {
    this.handleFunc = fn;
  }

  async serveHTTP(request: IncomingMessage, response: ServerResponse) {
    await this.serveHTTP(request, response);
  }
}
