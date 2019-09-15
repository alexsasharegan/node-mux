# node-mux

`node-mux` is a server framework designed around a route multiplexer. It aims to provide a high
degree of type safety to building servers while also maintaining an ergonomic API. It is built for
modern Node.js environments, which means Promises are central to the design.

## Example

```js
import http from "http";
import { Application, PlainTextResponse, RequestId, RequestLog } from "node-mux";

let app = new Application();

app.withAdapters(
  RequestId.injectIdAdapter,
  RequestId.setRequestIdHeaderAdapter,
  new RequestLog({ withColors: true })
);

app.get("/", async (rx, wx) => {
  let res = new PlainTextResponse({
    data: `Hello World!`,
  });

  await res.serveHTTP(rx, wx);
});

let server = http.createServer(app.serveHTTP);
server.listen(3000);
```
