import { IncomingMessage, ServerResponse } from "http";
import { randomBytes } from "crypto";
import os from "os";
import { Handler } from "../contracts";
import { HTTPHandler } from "../Handler";

/**
 * RequestID is a middleware that injects a request ID into the context of each
 * request. A request ID is a string of the form `"host.example.com/random-000001"`,
 * where "random" is a base62 random string that uniquely identifies this process,
 * and where the last number is an atomically incremented request counter.
 */
export class RequestId {
  /**
   * The request number since the process was launched.
   */
  readonly id = ++RequestId.id;

  /**
   * Create a string representation of the request id.
   */
  public toString(): string {
    return `${RequestId.prefix}-${this.id.toString(10).padStart(6, "0")}`;
  }

  /**
   * Method alias for `toString`.
   */
  public stringify(): string {
    return this.toString();
  }

  /**
   * Defines the JSON.stringify behavior for this object,
   * which is to render a string.
   */
  public toJSON() {
    return this.toString();
  }

  public static adapt(h: Handler): Handler {
    return new HTTPHandler(async (rx, wx) => {
      let id = new RequestId();
      // @ts-ignore
      rx[RequestId.kRequestId] = wx[RequestId.kRequestId] = id;
      wx.setHeader(RequestId.headerName, id.toString());
      await h.serveHTTP(rx, wx);
    });
  }

  /**
   * Given a request or a response object, extracts the injected request id.
   * This requires the `injectMiddleware` to have been placed upstream.
   * No runtime checks are executed to ensure request id was previously set.
   */
  public static extract(x: IncomingMessage | ServerResponse): undefined | RequestId {
    // @ts-ignore
    return x[RequestId.kRequestId];
  }

  /**
   * Change this if you want to configure a custom header for your request id.
   */
  public static headerName = "X-Request-ID";

  /**
   * The hostname as defined by the operating system.
   */
  protected static readonly hostname = os.hostname() || "localhost";

  /**
   * A string combining hostname + process guid:
   * ```js
   * "hostname/sf354as8d9"
   * ```
   */
  protected static readonly prefix = `${RequestId.hostname}/${RequestId.processGuid()}`;

  /**
   * Global request counter.
   */
  protected static id = 0;

  /**
   * The Symbol used to securely store a reference to a RequestId object on the request/response.
   *
   * ```js
   * Symbol(x-request-id)
   * ```
   */
  protected static get kRequestId(): Symbol {
    return Symbol.for("x-request-id");
  }

  /**
   * Generates a 10-character, base62 identifier. Used on startup to generate
   * a process id with sufficient entropy to avoid request id collisions in logs.
   */
  protected static processGuid(): string {
    let b64 = "";
    let replacer = /[\+\/]/g;
    // Generate a random base64 string, but reduce it to base 62.
    // This will likely only run once, but if our 2 unwanted chars
    // take up much of our string, this needs to rerun.
    while (b64.length < 10) {
      b64 = randomBytes(12)
        .toString("base64")
        .replace(replacer, "");
    }

    return b64.slice(0, 10);
  }
}
