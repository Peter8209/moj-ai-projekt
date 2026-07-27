import { createRequire } from "node:module";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const apiKey = process.env.ANTHROPIC_API_KEY;
const modelId =
  process.env.ANTHROPIC_MODEL ||
  "claude-sonnet-4-6";

if (!apiKey) {
  console.error("CHYBA: ANTHROPIC_API_KEY chýba.");
  process.exit(1);
}

console.log("====================================");
console.log("AI SDK + CLAUDE TEST");
console.log("====================================");
console.log("API key loaded:", Boolean(apiKey));
console.log("Model:", modelId);

try {
  const anthropic = createAnthropic({
    apiKey,
  });

  const result = await generateText({
    model: anthropic(modelId),

    prompt:
      "Odpovedz presne iba textom AI_SDK_CLAUDE_OK",

    maxOutputTokens: 64,
  });

  console.log("");
  console.log("TEXT:");
  console.log(result.text);

  console.log("");
  console.log("FINISH REASON:");
  console.log(result.finishReason);

  console.log("");
  console.log("USAGE:");
  console.log(result.usage);

  console.log("");
  console.log("TEST OK");
} catch (error) {
  console.error("");
  console.error("AI SDK CLAUDE TEST FAILED");
  console.error(error);

  if (error && typeof error === "object") {
    console.error(
      JSON.stringify(
        error,
        Object.getOwnPropertyNames(error),
        2,
      ),
    );
  }

  process.exit(1);
}
