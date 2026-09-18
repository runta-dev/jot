import { Parser } from "n3";
import { readFile } from "node:fs/promises";
export async function quantityKindBank() {
  const ttl = await readFile(".cache/qudt/quantitykinds.ttl", "utf8"),
    quads = new Parser().parse(ttl);
  const records = new Map<string, any>();
  for (const q of quads) {
    const id = q.subject.value;
    if (!id.startsWith("http://qudt.org/vocab/quantitykind/")) continue;
    let r = records.get(id);
    if (!r) {
      r = {
        uri: id,
        labels: [],
        descriptions: [],
        plain: [],
        deprecated: false,
      };
      records.set(id, r);
    }
    if (
      q.predicate.value === "http://www.w3.org/2000/01/rdf-schema#label" &&
      q.object.termType === "Literal" &&
      (!q.object.language || q.object.language === "en")
    )
      r.labels.push(q.object.value);
    if (
      q.predicate.value === "http://purl.org/dc/terms/description" &&
      q.object.termType === "Literal"
    )
      r.descriptions.push(q.object.value);
    if (
      q.predicate.value ===
        "http://qudt.org/schema/qudt/plainTextDescription" &&
      q.object.termType === "Literal"
    )
      r.plain.push(q.object.value);
    if (
      q.predicate.value === "http://www.w3.org/2002/07/owl#deprecated" &&
      q.object.value === "true"
    )
      r.deprecated = true;
  }
  return [...records.values()]
    .filter((r) => r.labels.length && !r.deprecated)
    .map((r, i) => {
      const original = (r.plain[0] || r.descriptions[0] || r.labels[0])
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const first = original.split(/(?<=[.!?])\s+/)[0];
      return {
        id: "q" + i,
        uri: r.uri,
        aliases: r.labels,
        definition: first.slice(0, 240),
        fullDefinition: original,
      };
    });
}
