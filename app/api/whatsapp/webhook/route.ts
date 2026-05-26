import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Evolution API webhook payload
  const { data, event } = body;
  if (!data || event !== "messages.upsert") return NextResponse.json({ ok: true });

  const messageKey = data.key;
  const messageContent = data.message?.conversation ?? data.message?.extendedTextMessage?.text ?? "";
  const fromPhone = messageKey?.remoteJid?.replace("@s.whatsapp.net", "") ?? "";

  if (!fromPhone || messageKey?.fromMe) return NextResponse.json({ ok: true });

  const patient = await prisma.patient.findFirst({
    where: { phone: { contains: fromPhone } },
    include: {
      appointments: {
        where: { status: "PENDING" },
        orderBy: { date: "asc" },
        take: 1,
      },
    },
  });

  if (!patient) return NextResponse.json({ ok: true });

  // Save inbound message
  await prisma.whatsAppMessage.create({
    data: {
      patientId: patient.id,
      direction: "INBOUND",
      content: messageContent,
      status: "READ",
    },
  });

  const upperMsg = messageContent.trim().toUpperCase();

  // Auto-confirm or cancel based on response
  if (patient.appointments[0] && (upperMsg === "SIM" || upperMsg === "S")) {
    await prisma.appointment.update({
      where: { id: patient.appointments[0].id },
      data: { status: "CONFIRMED" },
    });
  } else if (patient.appointments[0] && (upperMsg === "NÃO" || upperMsg === "NAO" || upperMsg === "N")) {
    await prisma.appointment.update({
      where: { id: patient.appointments[0].id },
      data: { status: "CANCELLED" },
    });
    // Move to re-scheduling stage
    await prisma.patient.update({
      where: { id: patient.id },
      data: { pipelineStatus: "quote" },
    });
  }

  return NextResponse.json({ ok: true });
}
