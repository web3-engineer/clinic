import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsApp, sendWhatsAppTemplate, type TemplateKey } from "@/lib/whatsapp";
import { z } from "zod";

const sendSchema = z.object({
  patientId: z.string(),
  message: z.string().optional(),
  templateKey: z.string().optional(),
  templateVars: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { patientId, message, templateKey, templateVars } = parsed.data;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  let content = message ?? "";

  try {
    if (templateKey && templateVars) {
      await sendWhatsAppTemplate(patient.phone, templateKey as TemplateKey, templateVars);
      content = templateKey;
    } else if (message) {
      await sendWhatsApp(patient.phone, message);
    }
  } catch {
    // WhatsApp API not configured — log only
  }

  const saved = await prisma.whatsAppMessage.create({
    data: {
      patientId,
      direction: "OUTBOUND",
      content,
      templateKey: templateKey ?? null,
      status: "SENT",
    },
  });

  return NextResponse.json(saved, { status: 201 });
}
