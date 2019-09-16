import http, { IncomingMessage, IncomingHttpHeaders } from "http";
import net from "net";
import util from "util";

export class MockRequest extends http.IncomingMessage {
  constructor() {
    super(
      new net.Socket({
        readable: true,
        writable: true,
      })
    );
  }

  with(x: { data?: Buffer; url?: string; method?: string; headers?: IncomingHttpHeaders }): this {
    if (typeof x.url == "string") {
      this.url = x.url;
    }
    if (typeof x.method == "string") {
      this.method = x.method;
    }
    if (x.headers) {
      Object.assign(this.headers, x.headers);
    }
    if (x.data) {
      this.withData(x.data);
    }

    return this;
  }

  withData(buf: Buffer) {
    this.socket.write(buf);
    return this;
  }

  createResponse() {
    return new MockResponse(this);
  }
}

export class MockResponse extends http.ServerResponse {
  constructor(rx: IncomingMessage) {
    super(rx);
  }

  write(...args: any[]) {
    // @ts-ignore
    process.stderr.write(util.format(...args));
    process.stderr.write("\n");
    // @ts-ignore
    let written = super.write(...args);
    process.stderr.write(util.format({ written }));
    process.stderr.write("\n");
    return written;
  }

  // @ts-ignore
  //   write = jest.fn(this.write);
  // @ts-ignore
  //   end = jest.fn(this.end);
}
