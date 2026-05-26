import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  patientId: z.string(),
  doctorId: z.string().optional(),
  date: z.string(),
  duration: z.number().default(30),
  type: z.string(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const date = searchParams.get("date");
  const patientId = searchParams.get("patientId");

  const where: Record<string, unknown> = {};

  if (date === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    where.date = { gte: today, lt: tomorrow };
  } else if (start && end) {
    where.date = { gte: new Date(start), lte: new Date(end) };
  }

  if (patientId) where.patientId = patientId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: { patient: true, doctor: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
    },
    include: { patient: true, doctor: true },
  });

  return NextResponse.json(appointment, { status: 201 });
}
