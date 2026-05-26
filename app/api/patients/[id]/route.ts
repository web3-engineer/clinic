import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { date: "desc" }, include: { doctor: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 50 },
      financials: { orderBy: { date: "desc" } },
    },
  });

  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      ...body,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(patient);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.patient.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
