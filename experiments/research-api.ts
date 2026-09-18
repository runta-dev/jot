import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
let apiKey: string | undefined;
export async function researchCall(request: unknown) {
  if (!apiKey) {
    const env = parse(await readFile(".env", "utf8"));
    apiKey =
      process.env.TYPESAFE_API_KEY ||
      process.env.JEV_API_KEY ||
      env.TYPESAFE_API_KEY ||
      env.JEV_API_KEY;
  }
  if (!apiKey) throw new Error("Jev API key not configured");
  let failure: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        const error = new Error(`HTTP ${response.status}`);
        if (![429, 500, 502, 503, 529].includes(response.status))
          throw Object.assign(error, { permanent: true });
        throw error;
      }
      return { data: await response.json(), attempts: attempt + 1 };
    } catch (error) {
      if ((error as { permanent?: boolean }).permanent) throw error;
      failure = error;
      if (attempt < 2)
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw failure;
}
