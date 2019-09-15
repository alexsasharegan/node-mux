import * as ContentTypes from "../content-type";
import * as enc from "../x-encoding";
import { WrappedError } from "../errors/WrappedError";
import { Renderer, RenderPayloadFunc } from "../contracts";

export type JSONReplacer = (this: any, key: string, value: any) => any;

export abstract class BasePayload implements Renderer, enc.Serializeable {
  public abstract contentType: ContentTypes.XContentType;
  public abstract data: any;

  renderPayload: RenderPayloadFunc = async (response) => {
    let chunk = await this.serialize();

    response.setHeader("Content-Type", this.contentType.toString());
    response.setHeader("Content-Length", chunk.byteLength);

    await new Promise<void>((resolve, reject) => {
      response.write(chunk, "utf8", function onErrorRenderPayload(error) {
        if (error) {
          reject(
            new WrappedError(`Failed to render payload while writing to the response.`, {
              previous: error,
            })
          );
        }
      });

      response.end(() => resolve());
    });
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

export class StreamedPayload implements Renderer {
  contentType: ContentTypes.Custom;
  data: NodeJS.ReadableStream;

  constructor({ contentType, data }: StreamedPayloadParams) {
    this.contentType = new ContentTypes.Custom(contentType);
    this.data = data;
  }

  renderPayload: RenderPayloadFunc = async (response) => {
    await new Promise((resolve, reject) => {
      response.setHeader("Content-Type", this.contentType.toString());

      this.data.setEncoding("utf8");

      this.data.on("error", (error) => {
        let wrapped = new WrappedError(
          `StreamedPayload failed while piping the readable stream to the response.`,
          { previous: error }
        );
        reject(wrapped);
      });

      this.data.on("end", () => resolve());

      this.data.pipe(
        response,
        { end: true }
      );
    });
  };
}
