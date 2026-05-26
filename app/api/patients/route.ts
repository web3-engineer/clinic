import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createPatientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  healthPlan: z.string().optional(),
  observations: z.string().optional(),
  pipelineStatus: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");

  const patients = await prisma.patient.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {},
        status ? { pipelineStatus: status } : {},
      ],
    },
    include: {
      appointments: {
        orderBy: { date: "desc" },
        take: 1,
      },
      _count: { select: { appointments: true, messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthDate, ...rest } = parsed.data;
  const patient = await prisma.patient.create({
    data: {
      ...rest,
      email: rest.email || null,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
