const http = require("http");
const mux = require("../lib/main");

let app = new mux.Application({
  logManager: new mux.LogManager(
    mux.LogLevel.All,
    new mux.StreamLogger(mux.LogLevel.All, { withColor: true })
  ),
});

mux.RequestLog.adapterOptions.withColors = true;

app.mux.withAdapters(mux.RequestId, mux.RequestId, mux.RequestLog);

app.mux.register("/", async (rx, wx) => {
  rx.logger.info(`Received a request on the '/' route.`);

  let res = new mux.PlainTextResponse({
    data: `Hello World!`,
  });

  await res.serveHTTP(rx, wx);
});

app.mux.registerHandler(
  "/user/",
  new mux.JSONResponse({
    data: {
      firstName: `Phil`,
      lastName: `Coulson`,
      agency: "S.H.I.E.L.D.",
    },
    status: 201,
    headers: {
      "X-Powered-By": "node-mux",
      "X-Test-Value": "foo",
    },
  })
);

let server = http.createServer(app.serveHTTP);

server.listen(3000, () => {
  app.logManager.info(`Server listening on port 3000.`);
});

server.on("close", () => {
  app.logManager.warn(`Server stopping.`);
});
