export enum ContentType {
  Custom,

  FormUrlEncoded,
  HTML,
  JSON,
  PlainText,
  RawData,
  XML,
}

export class XContentType {
  constructor(public readonly type: ContentType) {}

  toString(): string {
    switch (this.type) {
      default:
        throw new TypeError(`Unknown content type: ${this.type}`);

      case ContentType.Custom:
        throw new Error(`Custom content must override the toString method.`);

      case ContentType.FormUrlEncoded:
        return "application/x-www-form-urlencoded; charset=utf-8";
      case ContentType.HTML:
        return "text/html; charset=utf-8";
      case ContentType.JSON:
        return "application/json; charset=utf-8";
      case ContentType.PlainText:
        return "text/plain; charset=utf-8";
      case ContentType.RawData:
        return "application/octet-stream";
      case ContentType.XML:
        return "application/xml; charset=utf-8";
    }
  }
}

export class FormUrlEncoded extends XContentType {
  constructor() {
    super(ContentType.FormUrlEncoded);
  }
}

export class HTML extends XContentType {
  constructor() {
    super(ContentType.HTML);
  }
}

export class JSON extends XContentType {
  constructor() {
    super(ContentType.JSON);
  }
}

export class PlainText extends XContentType {
  constructor() {
    super(ContentType.PlainText);
  }
}

export class RawData extends XContentType {
  constructor() {
    super(ContentType.RawData);
  }
}

export class XML extends XContentType {
  constructor() {
    super(ContentType.XML);
  }
}

export class Custom extends XContentType {
  constructor(public headerValue: string) {
    super(ContentType.Custom);
  }

  toString() {
    return this.headerValue;
  }
}
