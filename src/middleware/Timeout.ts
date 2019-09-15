import { DurationUnit, sleep } from "../time";
import { Adapter, Handler, Request, Response } from "../contracts";
import { DefaultNotFoundHandler, DefaultRequestTimeoutHandler } from "../response";

export class TimeoutHandler implements Handler, Adapter {
  handler = DefaultNotFoundHandler;

  constructor(public timeout: DurationUnit) {}

  adapt(h: Handler): Handler {
    this.handler = h;
    return this;
  }

  async serveHTTP(rx: Request, wx: Response) {
    await Promise.race([
      await this.handler.serveHTTP(rx, wx),
      await sleep(this.timeout).then(() => Promise.reject(DefaultRequestTimeoutHandler)),
    ]);
  }
}
