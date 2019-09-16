import { DurationUnit, CancelableTimer } from "../time";
import { Adapter, Handler, Request, Response } from "../contracts";
import { DefaultNotFoundHandler, DefaultRequestTimeoutHandler } from "../response";

/**
 * DeadlineHandler is an Adapter that will fail a route handler
 * if it exceeds the timeout.
 *
 * This fails a request/response if the whole lifecycle exceeds the deadline.
 * If you need timeouts for the server sockets, use the server method
 * [server.setTimeout](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_server_settimeout_msecs_callback)
 * or set the [server.timeout](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_server_timeout)
 * value.
 */
export class DeadlineHandler implements Handler, Adapter {
  handler = DefaultNotFoundHandler;

  constructor(public deadline: DurationUnit) {}

  adapt(h: Handler): Handler {
    this.handler = h;
    return this;
  }

  async serveHTTP(rx: Request, wx: Response) {
    let deadline = new CancelableTimer(this.deadline);

    await Promise.race([
      this.handler.serveHTTP(rx, wx),
      deadline.sleep().then(() => Promise.reject(DefaultRequestTimeoutHandler)),
    ]);

    deadline.cancel();
  }
}
