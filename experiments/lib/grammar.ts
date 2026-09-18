import js from "jsrealb";
const { loadEn, S, NP, VP, PP, Pro, V, N, D, P, Q } = js;
loadEn();
js.setExceptionOnWarning(true);
const lex = js.getLexicon("en");
export function perspectiveVariants(text: string) {
  const parts = text.split(/(`[^`]*`|"[^"]*")/g);
  const converted = parts
    .map((p, i) =>
      i % 2
        ? p
        : p
            .replace(/\bI am\b/g, "you are")
            .replace(/\bI was\b/g, "you were")
            .replace(/\bI\b/g, "you")
            .replace(/\bmyself\b/gi, "yourself")
            .replace(/\bmy\b/gi, "your")
            .replace(/\bme\b/gi, "you"),
    )
    .join("");
  return [...new Set([text, converted])];
}
export function realizeFrame(slots: any, modifiers: any[] = []) {
  if (!slots.subject || !slots.verb) throw new Error("Incomplete frame");
  if (slots.voice === "passive" && slots.verb === "be")
    throw new Error("Invalid passive copula");
  const pronouns: Record<string, () => any> = {
    I: () => Pro("I").pe(1),
    you: () => Pro("I").pe(2),
    we: () => Pro("I").pe(1).n("p"),
    they: () => Pro("I").pe(3).n("p"),
    he: () => Pro("I").pe(3).g("m"),
    she: () => Pro("I").pe(3).g("f"),
    it: () => Pro("I").pe(3).g("n"),
  };
  const np = (text: string, det: string, number = "s") => {
    if (/^[a-z]+$/.test(text) && lex[text]?.N?.cnt === "no" && number === "p")
      throw new Error("Invalid mass noun plural");
    return NP(
      ...(det !== "NONE" && !/^(a|an|the)\s/i.test(text) ? [D(det)] : []),
      /^[a-z]+$/.test(text) && lex[text]?.N ? N(text).n(number) : Q(text),
    );
  };
  const subject = pronouns[slots.subject]
    ? pronouns[slots.subject]()
    : np(slots.subject, slots.subjectDet, slots.number);
  const elements: any[] =
    slots.voice === "passive"
      ? [V("be").t(slots.tense), V(slots.verb).t("pp")]
      : [V(slots.verb).t(slots.tense)];
  if (slots.object) {
    if (
      slots.voice === "passive" &&
      slots.object.toLowerCase() ===
        V(slots.verb).t("pp").realize().trim().toLowerCase()
    )
      throw new Error("Duplicate predicate complement");
    elements.push(np(slots.object, slots.objectDet, slots.objectNumber));
  }
  for (const m of modifiers)
    elements.push(
      m.relation === "time"
        ? Q(m.text)
        : m.relation === "because"
          ? Q("because of " + m.text)
          : m.relation === "named"
            ? Q("named " + m.text)
            : PP(P(m.relation), Q(m.text)),
    );
  const node = S(subject, VP(...elements)).typ({
    neg: slots.negated,
    ...(slots.modal === "NONE"
      ? {}
      : { mod: slots.modal === "should" ? "nece" : "poss" }),
  });
  if (slots.modal === "should") node.t("ps");
  const text = node.toString().trim();
  if (text.includes("[[")) throw new Error("Invalid realization marker");
  return text;
}
