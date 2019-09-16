# node-mux

`node-mux` is a server framework designed around a route multiplexer. It aims to provide a high
degree of type safety to building servers while also maintaining an ergonomic API. It is built for
modern Node.js environments, which means Promises are central to the design.

## Design

`node-mux` is designed around interfaces. The core interface is taken from Go's standard library:
the `Handler` interface. A Handler is any value with a method `serverHTTP` that conforms to the
`HandleFunc` signature. In TypeScript, it looks like this:

```ts
export type HandleFunc = (request: Request, response: Response) => Promise<any>;

export interface Handler {
  serveHTTP: HandleFunc;
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

### Handler & HandleFunc

A Handler is an object with a `serveHTTP` method that accepts a request and a response, and returns
a Promise that resolves once the Handler has finished serving the request. A Handler is fully
responsible for the request, unlike a connect-style function that may pass the request along to
another handler in the chain.

Since Handlers are objects, they can leverage their own state to process the request. In contrast, a
HandleFunc is a stateless version of the Handler. It still conforms the `serverHTTP`
signature--accepting a request and a response, and returning a Promise resolving upon
completion--but does so without the need of an object. A HandleFunc can easily be embedded into an
object to create a Handler.

#### Errors

One of the benefits of this interface is that Handlers processing a request may throw values that
also implement the Handler interface. When an error Handler is thrown, the root Handler will catch
this value and pass it execution of the request/response. As an example, if a Handler throws a
Handler error during its execution, the root Handler won't serve its generic 500 error response, but
will write the error's custom 404 response.

### Adapters

Many Node.js server frameworks leverage a middleware pattern to decorate routes with reusable
behaviors. The pattern considers a middleware function as a single link in a chain before the
request reaches the route's handler. That middleware function may add something to the
request/response, or it may respond early to fail a request, ending the chain.

Adapters also decorate routes with reusable behavior, but don't use the same chained continuation
pattern. An Adapter is any object with an `adapt` method on it that accepts a Handler and returns a
Handler.

```ts
export type AdapterFunc = (h: Handler) => Handler;

export interface Adapter {
  adapt: AdapterFunc;
}
```

This is a little meta at first, but in the same way higher order functions work. Here's a more
concrete example:

```ts
const logsBeforeAfterResponse: AdapterFunc = (handler) => {
  return {
    async serveHTTP(request, response) {
      request.logger.debug("before");

      await handler.serverHTTP(request, response);

      request.logger.debug("after");
    },
  };
};

const beforeAfterAdapter = {
  adapt: logsBeforeAfterResponse,
};
```

`beforeAfterAdapter` is an Adapter that will decorate Handlers with log messages before and after
the request has been served. The adapter implements the `adapt` method of the interface, and the
function correctly follows the signature of accepting a Handler and returning a Handler. Since it
closes over the original Handler, it has full control over the serving the request, and can choose
to call the original Handler or not. If it calls the original Handler, it now has access to before
and after the request is served--something not possible with the connect middleware pattern.

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
