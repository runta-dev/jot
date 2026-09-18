import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const db = require("wordnet-db");
export type VerbSense = {
  offset: string;
  lemmas: string[];
  definition: string;
  examples: string[];
  lexFile: number;
  frames: number[];
};
type RawSense = Omit<VerbSense, "frames"> & {
  assignments: { frame: number; word: number }[];
};
let cache: Promise<Map<string, VerbSense[]>> | undefined;
export async function verbSenses() {
  if (!cache)
    cache = (async () => {
      const data = await readFile(join(db.path, "data.verb"), "utf8");
      const synsets = new Map<string, RawSense>();
      for (const line of data.split("\n")) {
        if (!/^\d{8} /.test(line)) continue;
        const split = line.indexOf("|"),
          fields = line.slice(0, split).trim().split(/\s+/),
          gloss = line.slice(split + 1).trim(),
          count = parseInt(fields[3], 16);
        const lemmas = Array.from(
          { length: count },
          (_, i) => fields[4 + 2 * i],
        );
        let cursor = 4 + count * 2;
        const pointers = Number(fields[cursor++]);
        cursor += pointers * 4;
        const frameCount = Number(fields[cursor++] || 0),
          assignments: { frame: number; word: number }[] = [];
        for (let i = 0; i < frameCount; i++) {
          if (fields[cursor++] !== "+")
            throw new Error("Unexpected WordNet frame syntax");
          const frame = Number(fields[cursor++]),
            word = parseInt(fields[cursor++], 16);
          if (word > count) throw new Error("Invalid WordNet frame target");
          assignments.push({ frame, word });
        }
        synsets.set(fields[0], {
          offset: fields[0],
          lemmas,
          definition: gloss.split('; "')[0],
          examples: [...gloss.matchAll(/"([^"]*)"/g)].map((m) => m[1]),
          lexFile: Number(fields[1]),
          assignments,
        });
      }
      const result = new Map<string, VerbSense[]>(),
        index = await readFile(join(db.path, "index.verb"), "utf8");
      for (const line of index.split("\n")) {
        if (!line || /^\s/.test(line)) continue;
        const f = line.trim().split(/\s+/);
        if (f[1] !== "v") continue;
        const count = Number(f[2]),
          pointers = Number(f[3]);
        const senses = f
          .slice(6 + pointers, 6 + pointers + count)
          .map((offset) => {
            const raw = synsets.get(offset);
            if (!raw) throw new Error("WordNet index/data mismatch");
            const word =
              raw.lemmas.findIndex(
                (lemma) => lemma.toLowerCase() === f[0].toLowerCase(),
              ) + 1;
            if (word === 0) throw new Error("WordNet lemma mismatch");
            const { assignments, ...sense } = raw;
            return {
              ...sense,
              frames: [
                ...new Set(
                  assignments
                    .filter((a) => a.word === 0 || a.word === word)
                    .map((a) => a.frame),
                ),
              ],
            };
          });
        if (senses.length !== count)
          throw new Error("WordNet sense count mismatch");
        result.set(f[0], senses);
      }
      return result;
    })();
  return cache;
}
