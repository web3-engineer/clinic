import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const SYSTEM_PROMPT = `Você é um assistente inteligente de CRM médico para a Melo Oftalmologia.
Analise os dados fornecidos e retorne insights acionáveis em português brasileiro.
Seja objetivo, clínico e útil. Foco em: retenção, próximas ações, risco de churn.`;

export async function analyzePatient(patientData: unknown) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analise este paciente e sugira as próximas ações:\n${JSON.stringify(patientData, null, 2)}`,
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export async function generateProspectingMessage(lead: unknown) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Crie uma mensagem personalizada de reativação via WhatsApp para este lead. Tom: cordial, não invasivo, máximo 3 parágrafos:\n${JSON.stringify(lead, null, 2)}`,
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}
