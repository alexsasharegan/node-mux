import { performance } from "perf_hooks";
import { IncomingMessage, ServerResponse } from "http";
import * as bytes from "../bytes";
import { RequestId } from "./RequestId";
import * as time from "../time";
import { Handler, Request, Response } from "../contracts";
import { HTTPHandler } from "../Handler";
import { NewLine } from "../log";

export interface RequestLogOptions {
  withColors?: boolean;
  streams?: NodeJS.WritableStream[];
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
  protected newLine: NewLine;
  protected streams: NodeJS.WritableStream[] = [];

  constructor(rx: Request, wx: Response, options: RequestLogOptions = {}) {
    let { streams = [process.stderr], newLine = NewLine.LF } = options;

    this.streams.push(...streams);
    this.newLine = newLine;

    wx.on("finish", this.onFinish);

    this.response = wx;
    this.uri = rx.url || "";
    this.method = rx.method || "";
    this.httpVersion += rx.httpVersion;
    this.setIpAddr(rx);
    this.requestId = RequestId.extract(rx);
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

    for (let wx of this.streams) {
      wx.write(this.format() + this.newLine);
    }
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

  protected setIpAddr(rx: IncomingMessage): this {
    // Simplest access from the actual socket.
    let ip = rx.connection.remoteAddress;
    // Possible headers for when behind a proxy.
    let xff = rx.headers["x-forwarded-for"];
    let realIp = rx.headers["x-real-ip"];

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

  public static adapt(h: Handler): Handler {
    return new HTTPHandler(async (rx, wx) => {
      // The instance does not get garbage collected at the end of this function body
      // because the constructor sets up a response "finish" event listener.
      // The response emitter keeps this reference live until it is destroyed.
      new RequestLog(rx, wx, RequestLog.adapterOptions);
      await h.serveHTTP(rx, wx);
    });
  }

  public static adapterOptions: RequestLogOptions = {};

  public static CRLF = NewLine.CRLF;
  public static LF = NewLine.LF;
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
