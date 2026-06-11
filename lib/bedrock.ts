import { SYSTEM_PROMPT } from "./prompt";
import { mockPlan, type Plan } from "./mock";

type HistoryMsg = { role: "user" | "assistant"; content: string };

// Routes the question + generates SuiteQL via Bedrock. Falls back to DEMO MODE
// (built-in mock) when BEDROCK_MODEL_ID is not set, so the app always runs.
export async function routeAndGenerate(question: string, history: HistoryMsg[] = []): Promise<Plan> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) return mockPlan(question);

  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = await import("@aws-sdk/client-bedrock-runtime");
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
    const cmd = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-09-15",
        max_tokens: 1200,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          ...history,
          { role: "user", content: question },
        ],
      }),
    });
    const res = await client.send(cmd);
    const payload = JSON.parse(new TextDecoder().decode(res.body));
    const text = (payload.content || []).map((b: any) => b.text || "").join("\n");
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(clean) as Plan;
  } catch (err) {
    console.error("Bedrock call failed, using demo mode:", err);
    return mockPlan(question);
  }
}
