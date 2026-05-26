"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, Heart, Calendar, MessageCircle,
  DollarSign, CheckCircle2, XCircle, AlertCircle, Clock,
  TrendingUp, Send, User,
} from "lucide-react";
import Link from "next/link";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Doctor = { id: string; name: string; color: string };
type Appointment = {
  id: string; date: string; type: string; status: string;
  notes: string | null; duration: number; doctor: Doctor | null;
};
type Message = {
  id: string; direction: string; content: string; status: string; sentAt: string;
};
type Financial = {
  id: string; type: string; category: string; amount: number; status: string; date: string; description: string | null;
};
type Patient = {
  id: string; name: string; phone: string; email: string | null;
  healthPlan: string | null; birthDate: string | null; address: string | null;
  observations: string | null; pipelineStatus: string; createdAt: string;
  appointments: Appointment[]; messages: Message[]; financials: Financial[];
};

const STATUS_STYLES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  CONFIRMED: { label: "Confirmado", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  ATTENDED: { label: "Atendido", icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400" },
  PENDING: { label: "Pendente", icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
  NO_SHOW: { label: "Faltou", icon: XCircle, color: "text-red-600 dark:text-red-400" },
  CANCELLED: { label: "Cancelado", icon: XCircle, color: "text-black/40 dark:text-white/40" },
};

function avatarGradient(name: string) {
  const colors = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600", "from-green-400 to-green-600", "from-orange-400 to-orange-600", "from-pink-400 to-pink-600", "from-teal-400 to-teal-600"];
  return colors[name.charCodeAt(0) % colors.length];
}

const TABS = ["Resumo", "Histórico", "Comunicação", "Financeiro"];

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [msgInput, setMsgInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then(setPatient);
  }, [id]);

  const sendMessage = async () => {
    if (!msgInput.trim() || !patient) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, message: msgInput }),
      });
      if (!res.ok) throw new Error();
      toast.success("Mensagem enviada!");
      setMsgInput("");
      const updated = await fetch(`/api/patients/${id}`).then((r) => r.json());
      setPatient(updated);
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
      </div>
    );
  }

  const initials = patient.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const totalSpent = patient.financials.filter((f) => f.type === "receita" && f.status === "pago").reduce((s, f) => s + f.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/crm/patients" className="inline-flex items-center gap-2 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pacientes
        </Link>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient(patient.name)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-black dark:text-white">{patient.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-black/60 dark:text-white/60">
              {age && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{age} anos</span>}
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{patient.phone}</span>
              {patient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{patient.email}</span>}
              {patient.healthPlan && <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{patient.healthPlan}</span>}
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <div className="text-center px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5">
              <div className="text-xl font-bold text-black dark:text-white">{patient.appointments.length}</div>
              <div className="text-xs text-black/50 dark:text-white/50">Consultas</div>
            </div>
            <div className="text-center px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5">
              <div className="text-xl font-bold text-black dark:text-white">
                R$ {totalSpent.toLocaleString("pt-BR")}
              </div>
              <div className="text-xs text-black/50 dark:text-white/50">LTV</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl w-fit">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === i
                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* Tab 0 — Resumo */}
        {activeTab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
              <h3 className="font-bold text-black dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Engajamento
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-black/60 dark:text-white/60">Total de consultas</span>
                  <span className="font-bold text-black dark:text-white">{patient.appointments.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black/60 dark:text-white/60">Atendimentos realizados</span>
                  <span className="font-bold text-black dark:text-white">
                    {patient.appointments.filter((a) => a.status === "ATTENDED").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black/60 dark:text-white/60">Faltas</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {patient.appointments.filter((a) => a.status === "NO_SHOW").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black/60 dark:text-white/60">Mensagens trocadas</span>
                  <span className="font-bold text-black dark:text-white">{patient.messages.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
              <h3 className="font-bold text-black dark:text-white mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Informações
              </h3>
              <div className="space-y-3 text-sm">
                {patient.birthDate && (
                  <div className="flex justify-between">
                    <span className="text-black/60 dark:text-white/60">Nascimento</span>
                    <span className="font-medium text-black dark:text-white">
                      {format(new Date(patient.birthDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex justify-between">
                    <span className="text-black/60 dark:text-white/60">Endereço</span>
                    <span className="font-medium text-black dark:text-white text-right max-w-[60%]">{patient.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-black/60 dark:text-white/60">Cadastrado em</span>
                  <span className="font-medium text-black dark:text-white">
                    {format(new Date(patient.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              {patient.observations && (
                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                  <p className="text-xs text-black/50 dark:text-white/50 mb-1">Observações</p>
                  <p className="text-sm text-black dark:text-white">{patient.observations}</p>
                </div>
              )}
            </div>

            <div className="col-span-full rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
              <h3 className="font-bold text-black dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Próximas Consultas
              </h3>
              {patient.appointments.filter((a) => ["PENDING", "CONFIRMED"].includes(a.status) && new Date(a.date) >= new Date()).length === 0 ? (
                <p className="text-sm text-black/40 dark:text-white/40">Sem consultas agendadas</p>
              ) : (
                patient.appointments
                  .filter((a) => ["PENDING", "CONFIRMED"].includes(a.status) && new Date(a.date) >= new Date())
                  .map((a) => {
                    const s = STATUS_STYLES[a.status];
                    const StatusIcon = s.icon;
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                        <div>
                          <p className="font-medium text-sm text-black dark:text-white">{a.type}</p>
                          <p className="text-xs text-black/50 dark:text-white/50">
                            {format(new Date(a.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {a.doctor && ` · ${a.doctor.name}`}
                          </p>
                        </div>
                        <span className={`flex items-center gap-1 text-xs font-medium ${s.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {s.label}
                        </span>
                      </div>
                    );
                  })
              )}
              <Link
                href={`/crm/scheduling?patientId=${patient.id}`}
                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Calendar className="h-3.5 w-3.5" />
                Agendar Retorno
              </Link>
            </div>
          </div>
        )}

        {/* Tab 1 — Histórico */}
        {activeTab === 1 && (
          <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
            <h3 className="font-bold text-black dark:text-white mb-4">Histórico de Consultas</h3>
            {patient.appointments.length === 0 ? (
              <p className="text-sm text-black/40 dark:text-white/40">Sem consultas registradas</p>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-black/5 dark:bg-white/5" />
                <div className="space-y-4">
                  {patient.appointments.map((a, i) => {
                    const s = STATUS_STYLES[a.status] ?? STATUS_STYLES.PENDING;
                    const StatusIcon = s.icon;
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative pl-12"
                      >
                        <div className={`absolute left-3 top-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          a.status === "ATTENDED" ? "bg-blue-500" :
                          a.status === "CONFIRMED" ? "bg-green-500" :
                          a.status === "NO_SHOW" ? "bg-red-500" : "bg-black/20 dark:bg-white/20"
                        }`}>
                          <StatusIcon className="h-3 w-3 text-white" />
                        </div>
                        <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-black dark:text-white">{a.type}</p>
                              <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                                {format(new Date(a.date), "dd 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })}
                                {a.doctor && ` · ${a.doctor.name}`}
                              </p>
                            </div>
                            <span className={`text-xs font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
                          </div>
                          {a.notes && (
                            <p className="mt-2 text-xs text-black/60 dark:text-white/60 italic">{a.notes}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 — Comunicação */}
        {activeTab === 2 && (
          <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex flex-col h-[500px]">
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-bold text-sm text-black dark:text-white">{patient.name}</p>
                <p className="text-xs text-black/50 dark:text-white/50">{patient.phone}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {patient.messages.length === 0 ? (
                <p className="text-center text-sm text-black/40 dark:text-white/40 pt-8">Sem mensagens ainda</p>
              ) : (
                patient.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.direction === "OUTBOUND"
                        ? "bg-green-500 text-white rounded-br-sm"
                        : "bg-black/5 dark:bg-white/10 text-black dark:text-white rounded-bl-sm"
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction === "OUTBOUND" ? "text-white/70" : "text-black/40 dark:text-white/40"}`}>
                        {format(new Date(msg.sentAt), "HH:mm", { locale: ptBR })}
                        {msg.direction === "OUTBOUND" && ` · ${msg.status === "READ" ? "✓✓" : msg.status === "DELIVERED" ? "✓✓" : "✓"}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-black/5 dark:border-white/5 flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Escreva uma mensagem..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-black dark:text-white text-sm outline-none border border-transparent focus:border-black/20 dark:focus:border-white/20 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !msgInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition-all"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3 — Financeiro */}
        {activeTab === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl text-center">
                <DollarSign className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-black dark:text-white">
                  R$ {totalSpent.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50 mt-1">Total Gasto (LTV)</p>
              </div>
              <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl text-center">
                <Clock className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold text-black dark:text-white">
                  R$ {patient.financials.filter((f) => f.status === "pendente").reduce((s, f) => s + f.amount, 0).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50 mt-1">Pendente</p>
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
              <h3 className="font-bold text-black dark:text-white mb-4">Histórico Financeiro</h3>
              {patient.financials.length === 0 ? (
                <p className="text-sm text-black/40 dark:text-white/40">Sem registros financeiros</p>
              ) : (
                <div className="space-y-2">
                  {patient.financials.map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                      <div>
                        <p className="font-medium text-sm text-black dark:text-white capitalize">{f.category}</p>
                        <p className="text-xs text-black/50 dark:text-white/50">
                          {format(new Date(f.date), "dd/MM/yyyy", { locale: ptBR })}
                          {f.description && ` · ${f.description}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${f.type === "receita" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {f.type === "receita" ? "+" : "-"}R$ {f.amount.toLocaleString("pt-BR")}
                        </p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          f.status === "pago" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                          f.status === "pendente" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                          "bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50"
                        }`}>
                          {f.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
