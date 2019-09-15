import { ServerResponse } from "http";

export function endResponse(wx: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.on("error", reject);
    wx.end(resolve);
  });
}

export function writeFinal(wx: ServerResponse, chunk: any, encoding: string): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.on("error", reject);
    wx.write(chunk, encoding);
    wx.end(resolve);
  });
}
