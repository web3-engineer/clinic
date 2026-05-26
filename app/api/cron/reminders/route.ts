import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { format, addHours, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET() {
  const results = { reminders24h: 0, reminders2h: 0, birthdays: 0, returns: 0, errors: [] as string[] };

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // 24h reminders
  try {
    const upcomingTomorrow = await prisma.appointment.findMany({
      where: {
        date: { gte: tomorrow, lt: tomorrowEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
        reminder1Sent: false,
      },
      include: { patient: true },
    });

    for (const appt of upcomingTomorrow) {
      try {
        await sendWhatsAppTemplate(appt.patient.phone, "APPOINTMENT_REMINDER_24H", {
          name: appt.patient.name.split(" ")[0],
          service: appt.type,
          time: format(appt.date, "HH:mm", { locale: ptBR }),
        });
        await prisma.appointment.update({ where: { id: appt.id }, data: { reminder1Sent: true } });
        await prisma.whatsAppMessage.create({
          data: {
            patientId: appt.patientId,
            direction: "OUTBOUND",
            content: `Lembrete 24h: ${appt.type}`,
            templateKey: "APPOINTMENT_REMINDER_24H",
            status: "SENT",
          },
        });
        results.reminders24h++;
      } catch (e) {
        results.errors.push(`24h ${appt.id}: ${String(e)}`);
      }
    }
  } catch (e) {
    results.errors.push(`24h fetch: ${String(e)}`);
  }

  // 2h reminders
  try {
    const in2h = addHours(now, 2);
    const in2h30 = addHours(now, 2.5);
    const upcoming2h = await prisma.appointment.findMany({
      where: {
        date: { gte: in2h, lt: in2h30 },
        status: { in: ["PENDING", "CONFIRMED"] },
        reminder2Sent: false,
      },
      include: { patient: true },
    });

    for (const appt of upcoming2h) {
      try {
        await sendWhatsAppTemplate(appt.patient.phone, "APPOINTMENT_REMINDER_2H", {
          name: appt.patient.name.split(" ")[0],
          time: format(appt.date, "HH:mm", { locale: ptBR }),
        });
        await prisma.appointment.update({ where: { id: appt.id }, data: { reminder2Sent: true } });
        results.reminders2h++;
      } catch (e) {
        results.errors.push(`2h ${appt.id}: ${String(e)}`);
      }
    }
  } catch (e) {
    results.errors.push(`2h fetch: ${String(e)}`);
  }

  // Birthdays
  try {
    const todayMD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const allPatients = await prisma.patient.findMany({ where: { birthDate: { not: null } } });
    const birthdayPatients = allPatients.filter((p) => {
      if (!p.birthDate) return false;
      const bd = new Date(p.birthDate);
      return `${String(bd.getMonth() + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}` === todayMD;
    });

    for (const p of birthdayPatients) {
      try {
        await sendWhatsAppTemplate(p.phone, "BIRTHDAY", { name: p.name.split(" ")[0] });
        results.birthdays++;
      } catch (e) {
        results.errors.push(`birthday ${p.id}: ${String(e)}`);
      }
    }
  } catch (e) {
    results.errors.push(`birthdays: ${String(e)}`);
  }

  // Return reminders (patients with no appointment in 6+ months, max 20/day)
  try {
    const sixMonthsAgo = subMonths(now, 6);
    const inactivePatients = await prisma.patient.findMany({
      where: {
        appointments: {
          none: { date: { gte: sixMonthsAgo } },
          some: {},
        },
      },
      take: 20,
      include: { appointments: { orderBy: { date: "desc" }, take: 1 } },
    });

    for (const p of inactivePatients) {
      const lastAppt = p.appointments[0];
      const months = lastAppt
        ? Math.floor((now.getTime() - new Date(lastAppt.date).getTime()) / (30 * 864e5))
        : 6;
      try {
        await sendWhatsAppTemplate(p.phone, "RETURN_REMINDER", {
          name: p.name.split(" ")[0],
          months: months.toString(),
          link: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://clinicos.app"}/booking`,
        });
        results.returns++;
      } catch (e) {
        results.errors.push(`return ${p.id}: ${String(e)}`);
      }
    }
  } catch (e) {
    results.errors.push(`returns: ${String(e)}`);
  }

  return NextResponse.json({ success: true, ...results });
}
