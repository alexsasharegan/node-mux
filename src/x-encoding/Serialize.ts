import qs from "querystring";

export interface Serializeable {
  serialize(): Buffer;
}

type JSONReplacer = (this: any, key: string, value: any) => any;

export function serializeJSON(data: any, replacer?: JSONReplacer, space?: string | number): Buffer {
  let serialized: string;

  try {
    serialized = JSON.stringify(data, replacer, space);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Failed to encode data to content type JSON: ${String(error)}`);
  }

  return Buffer.from(serialized, "utf-8");
}

export type FormUrlEncodableData = qs.ParsedUrlQueryInput;
export type FormUrlEncodingOptions = qs.StringifyOptions;

export function serializeFormUrlEncoded(
  data: FormUrlEncodableData,
  options?: FormUrlEncodingOptions
): Buffer {
  try {
    return Buffer.from(qs.stringify(data, "&", "=", options), "utf-8");
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Failed to serialize data: ${String(error)}`);
  }
}
