import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const apiKey = process.env.ANTHROPIC_API_KEY;
const model =
  process.env.ANTHROPIC_MODEL ||
  "claude-sonnet-4-6";

console.log("Key loaded:", Boolean(apiKey));
console.log("Model:", model);

if (!apiKey) {
  console.error("CHYBA: ANTHROPIC_API_KEY nie je načítaný.");
  process.exit(1);
}

try {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 64,
        messages: [
          {
            role: "user",
            content:
              "Odpovedz presne iba textom CLAUDE_API_OK",
          },
        ],
      }),
    },
  );

  console.log("HTTP status:", response.status);

  const body = await response.text();
  console.log("Response:");
  console.log(body);

  if (!response.ok) {
    process.exit(1);
  }
} catch (error) {
  console.error("CLAUDE API TEST FAILED:");
  console.error(error);
  process.exit(1);
}
