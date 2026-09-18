export function isUnambiguouslyLocation(
  reference: string,
  judgements: { reference: string; choice: string; confidence: number }[],
  threshold = 0.85,
) {
  const applicable = judgements.filter((j) => j.reference === reference);
  return (
    applicable.length > 0 &&
    applicable.every(
      (j) =>
        j.choice === "location" &&
        Number.isFinite(j.confidence) &&
        j.confidence >= threshold,
    )
  );
}
