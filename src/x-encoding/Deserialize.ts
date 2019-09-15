import { JSONError } from "../errors/HTTPError";
import { StatusCode } from "../response";

/**
 * Convert a Buffer into type T.
 * Should throw an Error if decoding fails.
 */
export type DeserializeFunc<T = any> = (chunk: Buffer, encoding?: string) => T;

export interface Deserializeable<T = any> {
  deserialize: DeserializeFunc<T>;
}

export type ConcatFunc<T> = (acc: T, chunk: T) => T;

export function deserializeJSON<T = any>(buffer: Buffer, encoding?: string): T {
  try {
    return JSON.parse(buffer.toString(encoding));
  } catch (error) {
    throw new JSONError({
      code: StatusCode.UnprocessableEntity,
      message: `malformed request`,
      previous: error,
    });
  }
}

export async function deserializePlainText(
  buffer: Buffer,
  encoding: string = "utf8"
): Promise<string> {
  return buffer.toString(encoding);
}
