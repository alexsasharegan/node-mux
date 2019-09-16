import request from "supertest";
// import util from "util";
import { Application, isHTTPHandler, StatusCode } from "../src/main";

describe("Application", () => {
  it("should implement Handler", () => {
    let app = new Application();

    expect(app).toBeInstanceOf(Application);

    expect(isHTTPHandler(app)).toBe(true);
    expect(isHTTPHandler(app.router)).toBe(true);

    expect(isHTTPHandler({})).toBe(false);
    expect(isHTTPHandler(null)).toBe(false);
    expect(isHTTPHandler(undefined)).toBe(false);
    expect(isHTTPHandler([])).toBe(false);
    expect(isHTTPHandler({ serveHTTP: "" })).toBe(false);
  });

  it("should handle a request", async () => {
    let app = new Application();

    await request(app.serveHTTP)
      .get("/")
      .expect("Content-Type", /^application\/json/i)
      .expect(StatusCode.NotFound);
  });
});
