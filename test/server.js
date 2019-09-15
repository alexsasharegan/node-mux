const http = require("http");
const { Application, PlainTextResponse } = require("../lib/main");

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
