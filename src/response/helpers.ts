import { ServerResponse } from "http";

export function endResponse(response: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    response.on("error", reject);
    response.end(resolve);
  });
}

export function writeFinal(response: ServerResponse, chunk: any, encoding: string): Promise<any> {
  return new Promise((resolve, reject) => {
    response.on("error", reject);
    response.write(chunk, encoding);
    response.end(resolve);
  });
}
