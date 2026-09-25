import { decrypt } from "./auth";

export function runtimeSecrets(agent: Record<string, unknown>) {
  const custom = decrypt(agent.credentials as string | null);
  const legacy = agent.phone_number_id === process.env.PHONE_NUMBER_ID;
  return {
    PORTAL_DEMO_ENABLED: agent.id === process.env.DEMO_AGENT_ID ? "1" : "0",
    GEMINI_API_KEY: custom.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
    PHONE_NUMBER_ID: agent.phone_number_id || "",
    WHATSAPP_ACCESS_TOKEN:
      custom.WHATSAPP_ACCESS_TOKEN ||
      (legacy ? process.env.WHATSAPP_ACCESS_TOKEN : "") ||
      "",
    VERIFY_TOKEN: custom.VERIFY_TOKEN || process.env.VERIFY_TOKEN || "",
    WHATSAPP_APP_SECRET: custom.WHATSAPP_APP_SECRET || "",
  };
}
