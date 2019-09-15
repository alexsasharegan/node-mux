# node-mux

`node-mux` is a server framework designed around a route multiplexer. It aims to provide a high
degree of type safety to building servers while also maintaining an ergonomic API. It is built for
modern Node.js environments, which means Promises are central to the design.

## Example

```js
import http from "http";
import { Application, LogLevel, PlainTextResponse } from "node-mux";

let app = new Application();

app.get("/", (ctx) => {
  ctx.send(
    new PlainTextResponse({
      data: `Hello World!`,
    })
  );
});

let server = http.createServer(app.serveHTTP);
server.listen(3000);
```
