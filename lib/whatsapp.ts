import axios from "axios";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE ?? "melo-oftalmologia";

export const TEMPLATES = {
  APPOINTMENT_REMINDER_24H: `Olá, {{name}}! 👋\n\nLembrando que sua *{{service}}* está agendada para *amanhã, {{time}}* na Melo Oftalmologia.\n\nConfirme sua presença respondendo *SIM* ou reagende respondendo *NÃO*.\n\nAté amanhã! 🏥`,
  APPOINTMENT_REMINDER_2H: `Olá, {{name}}! Sua consulta começa em *2 horas* ({{time}}). Estamos te esperando! 😊`,
  APPOINTMENT_CONFIRMED: `✅ Consulta confirmada!\n\nNome: *{{name}}*\nData: *{{date}}*\nHorário: *{{time}}*\nServiço: *{{service}}*\n\nAté logo na Melo Oftalmologia!`,
  RETURN_REMINDER: `Olá, {{name}}! 👋\n\nNotamos que faz *{{months}} meses* desde sua última visita. Que tal agendar um retorno? Sua saúde ocular é nossa prioridade. 👁️\n\nAcesse: {{link}}`,
  BIRTHDAY: `🎉 Feliz Aniversário, {{name}}!\n\nA equipe da Melo Oftalmologia te deseja um dia incrível! Como presente, você tem *10% de desconto* na próxima consulta este mês. 🎁`,
  POST_CONSULTATION: `Olá, {{name}}! Como você está se sentindo após a {{service}} de hoje?\n\nSe tiver qualquer dúvida, estamos aqui. Avalie nossa consulta de 1 a 5 respondendo esta mensagem. ⭐`,
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

export async function sendWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, "");

  const response = await axios.post(
    `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
    { number: `${cleanPhone}@s.whatsapp.net`, text: message },
    { headers: { apikey: EVOLUTION_API_KEY } }
  );
  return response.data;
}

export async function sendWhatsAppTemplate(
  phone: string,
  templateKey: TemplateKey,
  vars: Record<string, string>
) {
  let message: string = TEMPLATES[templateKey];
  for (const [k, v] of Object.entries(vars)) {
    message = message.replaceAll(`{{${k}}}`, v);
  }
  return sendWhatsApp(phone, message);
}
