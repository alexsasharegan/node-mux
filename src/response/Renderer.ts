import { Context } from "../Context";
import * as ContentTypes from "../content-type";
import * as enc from "../x-encoding";

/**
 * The Renderer interface defines a single method `renderPayload`
 * that is responsible for the following:
 *
 * - setting the `Content-Type` & `Content-Length` headers
 * - writing the response payload
 * - returning a Promise that resolves once the payload write has finished
 */
export interface Renderer {
  renderPayload(ctx: Context): Promise<void>;
}

export type JSONReplacer = (this: any, key: string, value: any) => any;

export abstract class BasePayload implements Renderer, enc.Serializeable {
  public abstract contentType: ContentTypes.XContentType;
  public abstract data: any;

  renderPayload = async (ctx: Context) => {
    let chunk = await this.serialize();

    ctx.response.setHeader("Content-Type", this.contentType.toString());
    ctx.response.setHeader("Content-Length", chunk.byteLength);

    return new Promise<void>((resolve, reject) => {
      ctx.response.write(chunk, "utf8", function onWriteRenderedResponse(error) {
        if (error) {
          return reject(error);
        }

        resolve();
      });
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
