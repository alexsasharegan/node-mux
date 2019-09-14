import { Task } from "safe-types";
import qs from "querystring";

export interface Serializeable {
  serialize(): Task<Buffer, Error>;
}

type JSONReplacer = (this: any, key: string, value: any) => any;

export function serializeJSON(
  data: any,
  replacer?: JSONReplacer,
  space?: string | number
): Task<Buffer, Error> {
  return new Task(({ Ok, Err }) => {
    let serialized: string;

    try {
      serialized = JSON.stringify(data, replacer, space);
    } catch (error) {
      if (error instanceof Error) {
        return Err(error);
      }

      return Err(
        new Error(
          `Failed to encode data to content type JSON: ${String(error)}`
        )
      );
    }

    Ok(Buffer.from(serialized, "utf-8"));
  });
}

export function serializeFormUrlEncoded(
  data: qs.ParsedUrlQueryInput,
  options?: qs.StringifyOptions
) {
  return new Task<Buffer, never>(({ Ok }) => {
    Ok(Buffer.from(qs.stringify(data, "&", "=", options), "utf-8"));
  });
}
