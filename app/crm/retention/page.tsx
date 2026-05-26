"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle, CalendarClock, CheckCircle2, MessageCircle, Bell, RefreshCw, Play,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Appointment = {
  id: string; date: string; type: string; status: string; reminder1Sent: boolean; reminder2Sent: boolean;
  patient: { id: string; name: string; phone: string };
  doctor: { name: string } | null;
};

type ReturnAlert = {
  id: string; name: string; phone: string; lastDate: string; monthsAgo: number;
};

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function RetentionPage() {
  const [pendingAppts, setPendingAppts] = useState<Appointment[]>([]);
  const [returnAlerts, setReturnAlerts] = useState<ReturnAlert[]>([]);
  const [tab, setTab] = useState<"all" | "confirmations" | "returns">("all");
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, confirmed: 0 });

  const load = useCallback(async () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 864e5);
    const res = await fetch(`/api/appointments?start=${now.toISOString()}&end=${nextWeek.toISOString()}`);
    const appts: Appointment[] = await res.json();

    const pending = appts.filter((a) => ["PENDING", "CONFIRMED"].includes(a.status));
    setPendingAppts(pending);

    setStats({
      total: pending.length,
      sent: pending.filter((a) => a.reminder1Sent).length,
      confirmed: pending.filter((a) => a.status === "CONFIRMED").length,
    });

    // Return alerts — patients without appointments in 6+ months
    const patientsRes = await fetch("/api/patients");
    const patients = await patientsRes.json();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 864e5);

    const inactive: ReturnAlert[] = [];
    for (const p of patients.slice(0, 20)) {
      const lastAppt = p.appointments?.[0];
      if (!lastAppt || new Date(lastAppt.date) < sixMonthsAgo) {
        inactive.push({
          id: p.id,
          name: p.name,
          phone: p.phone,
          lastDate: lastAppt?.date ?? "",
          monthsAgo: lastAppt
            ? Math.floor((now.getTime() - new Date(lastAppt.date).getTime()) / (30 * 864e5))
            : 99,
        });
      }
    }
    setReturnAlerts(inactive.slice(0, 10));
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCron = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/cron/reminders");
      const data = await res.json();
      toast.success(`Lembretes enviados: ${data.reminders24h + data.reminders2h} · Retornos: ${data.returns} · Aniversários: ${data.birthdays}`);
      load();
    } catch {
      toast.error("Erro ao executar lembretes");
    } finally {
      setIsRunning(false);
    }
  };

  const sendWhatsApp = async (patientId: string, templateKey: string, vars: Record<string, string>) => {
    await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, templateKey, templateVars: vars }),
    });
    toast.success("Mensagem enviada!");
  };

  const confirmAppointment = async (id: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    toast.success("Consulta confirmada!");
    load();
  };

  const filtered = [
    ...(tab !== "returns" ? pendingAppts.map((a) => ({ type: "confirmation" as const, data: a })) : []),
    ...(tab !== "confirmations" ? returnAlerts.map((r) => ({ type: "return" as const, data: r })) : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white flex items-center gap-3">
            Lembretes
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold">
              {pendingAppts.length + returnAlerts.length}
            </span>
          </h1>
          <p className="text-black/60 dark:text-white/60">Confirmações pendentes e reativações de pacientes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Total", value: stats.total, color: "text-black dark:text-white" },
              { label: "Enviados", value: stats.sent, color: "text-blue-600 dark:text-blue-400" },
              { label: "Confirmados", value: stats.confirmed, color: "text-green-600 dark:text-green-400" },
            ].map((s) => (
              <div key={s.label} className="px-3 py-2 rounded-2xl bg-white/50 dark:bg-[#0a0a0a]/50 border border-black/5 dark:border-white/5 backdrop-blur-xl">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-black/40 dark:text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={runCron}
            disabled={isRunning}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
          >
            {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Executar Agora
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[["all", "Todos"], ["confirmations", "Confirmações"], ["returns", "Retornos"]] .map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value as typeof tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === value ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-3">
        {filtered.map(({ type, data }) => {
          if (type === "confirmation") {
            const a = data as Appointment;
            const riskLevel = a.status === "PENDING" && !a.reminder1Sent ? "high" : a.status === "PENDING" ? "medium" : "low";
            return (
              <motion.div key={a.id} variants={itemVariants} className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-5 rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl relative overflow-hidden group hover:shadow-md transition-all">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${riskLevel === "high" ? "bg-red-500" : riskLevel === "medium" ? "bg-yellow-500" : "bg-blue-500"}`} />
                <div className="flex items-center gap-4 pl-2">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
                      {a.patient.name}
                      {riskLevel === "high" && (
                        <span className="text-[10px] uppercase font-bold bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full tracking-wider">Alto Risco</span>
                      )}
                    </h3>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      {a.type} · {format(new Date(a.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      {a.doctor && ` · ${a.doctor.name}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {a.reminder1Sent && <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400"><Bell className="h-3 w-3" />Lembrete enviado</span>}
                      {a.status === "CONFIRMED" && <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400"><CheckCircle2 className="h-3 w-3" />Confirmado</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-16 md:pl-0 flex-shrink-0">
                  {a.status !== "CONFIRMED" && (
                    <button
                      onClick={() => sendWhatsApp(a.patient.id, "APPOINTMENT_REMINDER_24H", { name: a.patient.name.split(" ")[0], service: a.type, time: format(new Date(a.date), "HH:mm") })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => confirmAppointment(a.id)}
                    disabled={a.status === "CONFIRMED"}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${a.status === "CONFIRMED" ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {a.status === "CONFIRMED" ? "Confirmado" : "Confirmar"}
                  </button>
                </div>
              </motion.div>
            );
          }

          const r = data as ReturnAlert;
          return (
            <motion.div key={r.id} variants={itemVariants} className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-5 rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl relative overflow-hidden hover:shadow-md transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />
              <div className="flex items-center gap-4 pl-2">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-black dark:text-white">{r.name}</h3>
                  <p className="text-sm text-black/60 dark:text-white/60">
                    {r.lastDate
                      ? `Última visita: ${formatDistanceToNow(new Date(r.lastDate), { addSuffix: true, locale: ptBR })}`
                      : "Nunca visitou"}
                    {r.monthsAgo < 99 && ` (${r.monthsAgo} meses)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-16 md:pl-0 flex-shrink-0">
                <button
                  onClick={() => sendWhatsApp(r.id, "RETURN_REMINDER", { name: r.name.split(" ")[0], months: r.monthsAgo.toString(), link: "#" })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-bold transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />Enviar Retorno
                </button>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-black/30 dark:text-white/30">
            <CheckCircle2 className="h-12 w-12 mb-3" />
            <p className="font-medium">Nenhum alerta pendente</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
