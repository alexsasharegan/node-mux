import { Response } from "../contracts";

export function endResponse(wx: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.on("error", reject);
    wx.end(resolve);
  });
}

export function writeFinal(wx: Response, chunk: any, encoding: string): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.on("error", reject);
    wx.write(chunk, encoding);
    wx.end(resolve);
  });
}
