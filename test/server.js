const http = require("http");
const mux = require("../lib/main");

let app = new mux.ServeMux();
let logger = new mux.StreamLogger(mux.LogLevel.All, { withColor: true });

app.registerHandler(
  "/",
  new mux.PlainTextResponse({
    data: `Hello World!`,
  })
);

app.registerHandler(
  "/user/",
  new mux.JSONResponse({
    data: {
      firstName: `Phil`,
      lastName: `Coulson`,
      agency: "S.H.I.E.L.D.",
    },
    status: 201,
  })
);

let withLogging = mux.RequestLog.middleware({
  withColors: true,
});

let handler = mux.composeMiddleware(app, [
  mux.RequestId.injectIdAdapter,
  mux.RequestId.setRequestIdHeaderAdapter,
  withLogging,
]);

let server = http.createServer(async (request, response) => {
  try {
    await handler.serveHTTP(request, response);
  } catch (error) {
    logger.error(error);
    response.end();
  }
});

server.listen(3000, () => {
  logger.info(`Server listening on port 3000.`);
});

server.on("close", () => {
  logger.warn(`Server stopping.`);
});
