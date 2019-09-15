import * as ContentTypes from "../content-type/content-type";
import * as enc from "../x-encoding";
import { ResponseWriter, ResponseWriterFunc } from "../contracts";
import { writeFinal } from "./helpers";

export type JSONReplacer = (this: any, key: string, value: any) => any;

export abstract class BasePayload implements ResponseWriter, enc.Serializeable {
  public abstract contentType: ContentTypes.XContentType;
  public abstract data: any;

  writeResponse: ResponseWriterFunc = async (wx) => {
    let chunk = await this.serialize();

    wx.setHeader("Content-Type", this.contentType.toString());
    wx.setHeader("Content-Length", chunk.byteLength);

    await writeFinal(wx, chunk, "utf8");
  };

  abstract serialize(): Promise<Buffer> | Buffer;
}

export class JSONPayload<T> extends BasePayload {
  public contentType = new ContentTypes.JSON();
  public replacer?: JSONReplacer;

  constructor(public data: T, options: { replacer?: JSONReplacer } = {}) {
    super();
    if (options.replacer) {
      this.replacer = options.replacer;
    }
  }

  serialize() {
    return enc.serializeJSON(this.data, this.replacer);
  }
}

export class FormUrlEncodedPayload extends BasePayload {
  public contentType = new ContentTypes.FormUrlEncoded();

  constructor(public data: enc.FormUrlEncodableData, public options?: enc.FormUrlEncodingOptions) {
    super();
  }

  serialize() {
    return enc.serializeFormUrlEncoded(this.data, this.options);
  }
}

export class RawDataPayload extends BasePayload {
  public contentType = new ContentTypes.RawData();

  constructor(public data: Buffer) {
    super();
  }

  serialize() {
    return this.data;
  }
}

export class PlainTextPayload extends BasePayload {
  public contentType = new ContentTypes.PlainText();

  constructor(public data: Buffer | string) {
    super();
  }

  serialize() {
    if (typeof this.data === "string") {
      return Buffer.from(this.data, "utf-8");
    }

    return this.data;
  }
}

export class HTMLPayload extends PlainTextPayload {
  public contentType = new ContentTypes.HTML();
}

export class XMLPayload extends PlainTextPayload {
  public contentType = new ContentTypes.XML();
}

export interface StreamedPayloadParams {
  data: NodeJS.ReadableStream;
  contentType: string;
}

export class StreamedPayload implements ResponseWriter {
  contentType: ContentTypes.Custom;
  data: NodeJS.ReadableStream;

  constructor({ contentType, data }: StreamedPayloadParams) {
    this.contentType = new ContentTypes.Custom(contentType);
    this.data = data;
  }

  writeResponse: ResponseWriterFunc = async (wx) => {
    await new Promise((resolve, reject) => {
      wx.setHeader("Content-Type", this.contentType.toString());

      this.data.setEncoding("utf8");
      this.data.on("error", reject);
      this.data.on("end", resolve);
      this.data.pipe(
        wx,
        { end: true }
      );
    });
  };
}
