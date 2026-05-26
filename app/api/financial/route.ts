import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  patientId: z.string().optional(),
  type: z.enum(["receita", "despesa"]),
  category: z.string(),
  amount: z.number(),
  status: z.enum(["pago", "pendente", "cancelado"]),
  date: z.string(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (start && end) where.date = { gte: new Date(start), lte: new Date(end) };

  const records = await prisma.financialRecord.findMany({
    where,
    include: { patient: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  const totalRevenue = records
    .filter((r) => r.type === "receita" && r.status === "pago")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = records
    .filter((r) => r.type === "despesa" && r.status === "pago")
    .reduce((sum, r) => sum + r.amount, 0);

  const pending = records
    .filter((r) => r.status === "pendente")
    .reduce((sum, r) => sum + r.amount, 0);

  return NextResponse.json({ records, totalRevenue, totalExpenses, pending });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.financialRecord.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });

  return NextResponse.json(record, { status: 201 });
}
