# node-mux

`node-mux` is a server framework designed around a route multiplexer. It aims to provide a high
degree of type safety to building servers while also maintaining an ergonomic API. It is built for
modern Node.js environments, which means Promises are central to the design.

## Design

`node-mux` is designed around interfaces. The core interface is taken from Go's standard library:
the `Handler` interface. A Handler is just any value with a method `serverHTTP` on it conforming to
the `HandleFunc` signature. In TypeScript, it looks like this:

```ts
export type HandleFunc = (request: Request, response: Response) => Promise<any>;

export interface Handler {
  serveHTTP(request: Request, response: Response): Promise<any>;
}
```

Node.js' `http` library is designed around a similar signature:

```ts
type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;
```

In `node-mux`, the `Application` implements the `RequestListener` interface, then upgrades the
request type `IncomingMessage` to its own type `Request`, and likewise with `ServerResponse` to
`Response`. These types provide additional ergonomics, but do not hide any low-level control from
you.

## Example

```js
import http from "http";
import fs from "fs";
import {
  Application,
  LogManager,
  LogLevel,
  StreamLogger,
  PlainTextResponse,
  RequestId,
  RequestLog,
  JSONReader,
  toBytes,
} from "node-mux";

// Open a stream to a log file.
let logStream = fs.createWriteStream("/var/log/node/test.log", {
  flags: "a",
  encoding: "utf8",
});

// A log manager implements the Logger interface
// and multiplexes log writes. The manager's log level
// controls everything under its control,
// but each logger still has a level that controls its output.
let logManager = new LogManager(
  LogLevel.All,
  // Log to the file stream without colors.
  new StreamLogger(LogLevel.All, { withColor: false, stream: logStream }),
  // Log to stderr stream in color.
  new StreamLogger(LogLevel.All, { withColor: true, stream: process.stderr })
);
RequestLog.adapterOptions.withColors = true;

// Application is the top level Handler.
// All Handlers implement the `serverHTTP` method.
let app = new Application({ logManager });

// Set up adapters--like middleware--to decorate the app with extra behavior.
app.withAdapters(
  RequestId,
  RequestLog,
  new JSONReader({
    limit: toBytes(100, "KiB"),
    encoding: "utf8",
  })
);

// Route handle functions always receive just a Request and Response.
// This is the signature of a Handlers `serverHTTP` method.
app.mux.register("/", async (rx, wx) => {
  // The reader (request) receives a Logger implementation.
  rx.logger.info(`Received a request on the '/' route.`);

  // Responses are Handlers
  let res = new PlainTextResponse({
    data: `Hello World!`,
  });

  // The writer (response) receives the same Logger implementation.
  wx.logger.debug(res);

  // The writer (response) can send Handlers.
  await wx.send(res);
});

// The Handler method from the Application
// conforms to the http.RequestListener signature.
let server = http.createServer(app.serveHTTP);
server.listen(3000);
```
