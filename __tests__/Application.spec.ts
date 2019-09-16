import request from "supertest";
// import util from "util";
import { Application, isHTTPHandler, StatusCode } from "../src/main";

describe("Application", () => {
  it("should be a Handler", () => {
    let app = new Application();

    expect(app).toBeInstanceOf(Application);
    expect(isHTTPHandler(app)).toBe(true);
  });

  it("should handle a request", async () => {
    let app = new Application();

    await request(app.serveHTTP)
      .get("/")
      .expect("Content-Type", /^application\/json/i)
      .expect(StatusCode.NotFound);
  });
});
