// Untyped JSON from outside the app (Data Dragon, the League client, the game's Live Client
// Data API, files written by older versions). Only the parsing functions at those boundaries
// take it; everything they return is typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawJson = any;

// A translated text: a key of src/lang/<code>.json with its parameters.
export interface TextKey {
  key: string;
  params?: Record<string, string | number>;
}
