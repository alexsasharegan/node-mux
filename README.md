# node-mux

`node-mux` is a server framework designed around a route multiplexer. It aims to provide a high
degree of type safety to building servers while also maintaining an ergonomic API. It is built for
modern Node.js environments, which means Promises are central to the design.

## Example

```js
import http from "http";
import { Application, PlainTextResponse, RequestId, RequestLog } from "node-mux";

let app = new Application();

RequestLog.adapterOptions.withColors = true;
app.withAdapters(RequestId, RequestLog);

app.get("/", async (rx, wx) => {
  rx.logger.info(`Received a request on the '/' route.`);

  let res = new PlainTextResponse({
    data: `Hello World!`,
  });

  rx.logger.debug(res);

  await res.serveHTTP(rx, wx);
});

let server = http.createServer(app.serveHTTP);
server.listen(3000);
```
