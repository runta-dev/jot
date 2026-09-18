import { Tokenizer } from "@huggingface/tokenizers";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const tokenizerModels = {
  gpt2: {
    model: "openai-community/gpt2",
    revision: "607a30d783dfa663caf39e06633721c8d4cfcd7e",
  },
  t5: {
    model: "google-t5/t5-small",
    revision: "df1b051c49625cf57a3d0d8d3863ed4d13564fe4",
  },
  smollm: {
    model: "HuggingFaceTB/SmolLM2-135M",
    revision: "93efa2f097d58c2a74874c7e644dbc9b0cee75a2",
  },
} as const;
export type TokenizerName = keyof typeof tokenizerModels;
const instances = new Map<TokenizerName, Promise<Tokenizer>>();

async function loadFile(name: TokenizerName, file: string) {
  const source = tokenizerModels[name];
  const directory = resolve(".cache/tokenizers", name, source.revision);
  const path = resolve(directory, file);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const response = await fetch(
    `https://huggingface.co/${source.model}/resolve/${source.revision}/${file}`,
    { signal: AbortSignal.timeout(60000) },
  );
  if (!response.ok)
    throw new Error(
      `Tokenizer download failed: ${source.model}/${file} (${response.status})`,
    );
  const data = await response.json();
  await mkdir(directory, { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(data));
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
  return data;
}

/** Download only pinned tokenizer assets, never model weights. Cache locally. */
export function loadTokenizer(
  name: TokenizerName = "smollm",
): Promise<Tokenizer> {
  let instance = instances.get(name);
  if (!instance) {
    instance = Promise.all([
      loadFile(name, "tokenizer.json"),
      loadFile(name, "tokenizer_config.json"),
    ])
      .then(([definition, config]) => new Tokenizer(definition, config))
      .catch((error) => {
        instances.delete(name);
        throw error;
      });
    instances.set(name, instance);
  }
  return instance;
}

export function encodeText(tokenizer: Tokenizer, text: string): number[] {
  return tokenizer.encode(text, { add_special_tokens: false }).ids;
}

/** Decode the complete sequence: one token can contain only part of a UTF-8 character. */
export function decodeTokens(tokenizer: Tokenizer, ids: number[]): string {
  return tokenizer.decode(ids, {
    skip_special_tokens: false,
    clean_up_tokenization_spaces: false,
  });
}
