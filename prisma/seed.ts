import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dr1 = await prisma.doctor.upsert({
    where: { id: "doc-1" },
    update: {},
    create: {
      id: "doc-1",
      name: "Dr. Rafael Melo",
      crm: "CRM-SP 123456",
      specialty: "Oftalmologia Geral",
      color: "#3B82F6",
    },
  });

  const dr2 = await prisma.doctor.upsert({
    where: { id: "doc-2" },
    update: {},
    create: {
      id: "doc-2",
      name: "Dra. Fernanda Costa",
      crm: "CRM-SP 234567",
      specialty: "Retina e Vítreo",
      color: "#8B5CF6",
    },
  });

  const patients = [
    { id: "p1", name: "Ana Clara Souza", phone: "11987654321", email: "ana@email.com", healthPlan: "Unimed", pipelineStatus: "scheduled", birthDate: new Date("1985-03-15") },
    { id: "p2", name: "João Pedro Lima", phone: "11912345678", email: "joao@email.com", healthPlan: "SulAmérica", pipelineStatus: "new", birthDate: new Date("1978-07-22") },
    { id: "p3", name: "Marina Silva", phone: "21999998888", email: "marina@email.com", healthPlan: "Bradesco Saúde", pipelineStatus: "attended", birthDate: new Date("1990-11-05") },
    { id: "p4", name: "Carlos Ramirez", phone: "31977776666", email: "carlos@email.com", healthPlan: "Amil", pipelineStatus: "noshow", birthDate: new Date("1965-08-30") },
    { id: "p5", name: "Lucia Mendes", phone: "11955554444", email: "lucia@email.com", healthPlan: "Particular", pipelineStatus: "new", birthDate: new Date("1995-05-26") },
    { id: "p6", name: "Arthur Costa", phone: "11933332222", email: "arthur@email.com", healthPlan: "Unimed", pipelineStatus: "scheduled", birthDate: new Date("1982-12-01") },
    { id: "p7", name: "Beatriz Fernandes", phone: "21911110000", email: "beatriz@email.com", healthPlan: "SulAmérica", pipelineStatus: "attended", birthDate: new Date("1992-04-18") },
    { id: "p8", name: "Roberto Alves", phone: "11966665555", email: "roberto@email.com", healthPlan: "Particular", pipelineStatus: "quote", birthDate: new Date("1970-09-14") },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  const now = new Date();
  const today = (h: number, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  const offset = (days: number, h: number, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);

  const appointments = [
    { id: "a1", patientId: "p1", doctorId: dr1.id, date: today(9), type: "Consulta Geral", status: "CONFIRMED", duration: 30 },
    { id: "a2", patientId: "p2", doctorId: dr1.id, date: today(10, 30), type: "Cirurgia Refrativa", status: "PENDING", duration: 60 },
    { id: "a3", patientId: "p3", doctorId: dr2.id, date: today(14), type: "Exame de Retina", status: "ATTENDED", duration: 45 },
    { id: "a4", patientId: "p4", doctorId: dr1.id, date: offset(1, 9), type: "Mapeamento", status: "PENDING", duration: 30 },
    { id: "a5", patientId: "p5", doctorId: dr2.id, date: offset(1, 11), type: "Consulta Geral", status: "PENDING", duration: 30 },
    { id: "a6", patientId: "p6", doctorId: dr1.id, date: offset(2, 15), type: "Consulta Geral", status: "CONFIRMED", duration: 30 },
    { id: "a7", patientId: "p3", doctorId: dr2.id, date: offset(-30, 10), type: "Exame de Retina", status: "ATTENDED", duration: 45 },
    { id: "a8", patientId: "p7", doctorId: dr1.id, date: today(11, 30), type: "Lentes de Contato", status: "CONFIRMED", duration: 30 },
    { id: "a9", patientId: "p1", doctorId: dr1.id, date: offset(-60, 9), type: "Consulta Geral", status: "ATTENDED", duration: 30 },
    { id: "a10", patientId: "p4", doctorId: dr1.id, date: offset(-7, 9), type: "Mapeamento", status: "NO_SHOW", duration: 30 },
  ];

  for (const a of appointments) {
    await prisma.appointment.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  const financials = [
    { id: "f1", patientId: "p1", type: "receita", category: "consulta", amount: 250, status: "pago", date: offset(-2, 9), description: null },
    { id: "f2", patientId: "p3", type: "receita", category: "exame", amount: 180, status: "pago", date: offset(-5, 9), description: null },
    { id: "f3", patientId: "p2", type: "receita", category: "cirurgia", amount: 3500, status: "pendente", date: offset(1, 9), description: null },
    { id: "f4", patientId: null, type: "despesa", category: "material", amount: 800, status: "pago", date: offset(-10, 9), description: "Material oftalmológico" },
    { id: "f5", patientId: "p7", type: "receita", category: "consulta", amount: 250, status: "pago", date: today(9), description: null },
    { id: "f6", patientId: null, type: "despesa", category: "salário", amount: 5000, status: "pago", date: new Date(now.getFullYear(), now.getMonth(), 5), description: "Folha de pagamento" },
    { id: "f7", patientId: "p6", type: "receita", category: "consulta", amount: 250, status: "pendente", date: offset(2, 9), description: null },
  ];

  for (const f of financials) {
    await prisma.financialRecord.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  const messages = [
    { id: "m1", patientId: "p1", direction: "OUTBOUND", content: "Olá, Ana! Lembrando da sua consulta amanhã. Confirme com SIM.", status: "READ" },
    { id: "m2", patientId: "p1", direction: "INBOUND", content: "SIM", status: "READ" },
    { id: "m3", patientId: "p4", direction: "OUTBOUND", content: "Olá, Carlos! Você faltou à consulta. Quer remarcar?", status: "DELIVERED" },
    { id: "m4", patientId: "p5", direction: "OUTBOUND", content: "Olá, Lucia! Sua consulta é amanhã às 11:00. Confirme com SIM.", status: "SENT" },
  ];

  for (const m of messages) {
    await prisma.whatsAppMessage.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, sentAt: new Date() },
    });
  }

  console.log("Seed concluído — Melo Oftalmologia pronta!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
