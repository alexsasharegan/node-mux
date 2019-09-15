import { IncomingMessage, ServerResponse } from "http";
import { performance } from "perf_hooks";
import chalk from "chalk";
import * as bytes from "../bytes";
import { RequestId } from "./RequestId";
import * as time from "../time";
import { Adapter } from "../contracts";

enum NewLine {
  /**
   * Linux/Mac style new line.
   */
  LF = "\n",
  /**
   * Windows style new line.
   */
  CRLF = "\r\n",
}

export interface RequestLogOptions {
  withColors?: boolean;
  stream?: NodeJS.WriteStream;
  newLine?: NewLine;
}

export class RequestLog {
  protected incomingDate = new Date();
  protected start = performance.now();
  protected end = 0;
  protected uri = "";
  protected method = "";
  protected statusCode = 0;
  protected requestId: undefined | RequestId;
  protected httpVersion = "HTTP/";
  protected ipAddr = "";
  protected contentLength = "0";
  protected response: ServerResponse;
  protected withColors: boolean;
  protected newLine: NewLine;
  protected stream: NodeJS.WriteStream;

  constructor(request: IncomingMessage, response: ServerResponse, options: RequestLogOptions = {}) {
    let { withColors = false, stream = process.stderr, newLine = NewLine.LF } = options;

    this.withColors = withColors;
    this.stream = stream;
    this.newLine = newLine;

    response.on("finish", this.onFinish);

    this.response = response;
    this.uri = request.url;
    this.method = request.method;
    this.httpVersion += request.httpVersion;
    this.setIpAddr(request);
    this.requestId = RequestId.extract(request);
  }

  /**
   * Handler for the end of the response. This is when timers are stopped
   * and the actual logging is performed. Uses an arrow function as a class
   * property so we can pass the method handle to the response's event emitter
   * and guarantee our lexical `this` context is preserved.
   *
   * ### The Response `"finish"` Event
   *
   * Emitted when the response has been sent.
   * More specifically, this event is emitted when the last segment of the response headers
   * and body have been handed off to the operating system for transmission over the network.
   * It does not imply that the client has received anything yet.
   */
  protected onFinish = () => {
    this.stopTime();
    this.statusCode = this.response.statusCode;
    let contentLength = this.response.getHeader("content-length");
    if (typeof contentLength === "string" || typeof contentLength === "number") {
      this.contentLength = String(contentLength);
    }

    this.stream.write(this.format() + this.newLine);
  };

  protected format(): string {
    let { method, uri, httpVersion, ipAddr } = this;
    let statusCode = this.statusCode.toString(10);
    let elapsed = time.stringify(this.end - this.start);
    let size = bytes.format(parseIntStrict(this.contentLength, -1), {
      useBinary: false,
      precision: 1,
    });
    let dt = this.fmtDate(this.incomingDate);
    let reqId = `[${this.requestId == null ? "" : this.requestId.toString()}]`;
    let quote = `"`;

    if (this.withColors) {
      reqId = chalk.yellow(reqId);
      method = chalk.bold(chalk.magenta(method));
      quote = chalk.cyan(quote);
      uri = chalk.cyan(uri);
      httpVersion = chalk.cyan(httpVersion);
      statusCode = chalk.bold(chalk.green(statusCode));
      size = chalk.bold(chalk.blue(size));
      elapsed = chalk.green(elapsed);
    }

    return `${dt} ${reqId} ${quote}${method} ${uri} ${httpVersion}${quote} from ${ipAddr} - ${statusCode} ${size} in ${elapsed}`;
  }

  toString(): string {
    return this.format();
  }

  toJSON(): string {
    return this.format();
  }

  protected fmtDate(d: Date) {
    let YYYY = d.getFullYear();
    let MM = padZero(d.getMonth() + 1);
    let DD = padZero(d.getDate());

    let hh = padZero(d.getHours());
    let mm = padZero(d.getMinutes());
    let ss = padZero(d.getSeconds());

    return `${YYYY}/${MM}/${DD} ${hh}:${mm}:${ss}`;
  }

  protected setIpAddr(request: IncomingMessage): this {
    // Simplest access from the actual socket.
    let ip = request.connection.remoteAddress;
    // Possible headers for when behind a proxy.
    let xff = request.headers["x-forwarded-for"];
    let realIp = request.headers["x-real-ip"];

    if (Array.isArray(xff)) {
      ip = xff[xff.length - 1];
    } else if (typeof xff === "string") {
      ip = xff;
    } else if (typeof realIp === "string") {
      ip = realIp;
    }

    if (ip) {
      this.ipAddr = ip;
    }

    return this;
  }

  protected stopTime(): this {
    this.end = performance.now();
    return this;
  }

  /**
   * A function returning a connect middleware to perform request logging.
   * Options passed here are supplied to the RequestLog instance on each request.
   */
  public static middleware(options: RequestLogOptions): Adapter {
    return function requestLoggingAdapter(h) {
      return {
        serveHTTP(request, response) {
          // The instance does not get garbage collected at the end of this function body
          // because the constructor sets up a response "finish" event listener.
          // The response emitter keeps this reference live until it is destroyed.
          new RequestLog(request, response, options);
          h.serveHTTP(request, response);
        },
      };
    };
  }

  public static NewLine = NewLine;
}

/**
 * Left pads numbers with '0' to maintain 2 char length.
 */
function padZero(n: number): string {
  return n.toString(10).padStart(2, "0");
}

/**
 * Like `parseInt`, except always parses in base 10 and uses the default value
 * when parsing fails.
 */
function parseIntStrict(s: string, def: number): number {
  let n = parseInt(s, 10);
  if (Number.isNaN(n)) {
    return def;
  }
  return n;
}
