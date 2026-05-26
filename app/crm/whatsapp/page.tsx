"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Send, MessageCircle, Check, CheckCheck, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Message = {
  id: string; direction: string; content: string; status: string; sentAt: string; templateKey: string | null;
};
type Patient = {
  id: string; name: string; phone: string;
  messages: Message[];
  _count: { messages: number };
};

const TEMPLATES = [
  { key: "APPOINTMENT_REMINDER_24H", label: "Lembrete 24h" },
  { key: "RETURN_REMINDER", label: "Retorno" },
  { key: "POST_CONSULTATION", label: "Pós-Consulta" },
  { key: "BIRTHDAY", label: "Aniversário" },
];

function avatarGradient(name: string) {
  const g = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600", "from-green-400 to-green-600", "from-orange-400 to-orange-600", "from-pink-400 to-pink-600"];
  return g[name.charCodeAt(0) % g.length];
}

function StatusIcon({ status }: { status: string }) {
  if (status === "READ") return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === "DELIVERED") return <CheckCheck className="h-3 w-3 text-black/40 dark:text-white/40" />;
  return <Check className="h-3 w-3 text-black/40 dark:text-white/40" />;
}

export default function WhatsAppPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchPatients = useCallback(async () => {
    const res = await fetch("/api/patients");
    const data: Patient[] = await res.json();
    // Sort by latest message
    const withMessages = await Promise.all(
      data.map(async (p) => {
        const pr = await fetch(`/api/patients/${p.id}`);
        return pr.json() as Promise<Patient>;
      })
    );
    withMessages.sort((a, b) => {
      const aLast = a.messages[0]?.sentAt ?? a.id;
      const bLast = b.messages[0]?.sentAt ?? b.id;
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });
    setPatients(withMessages);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, patients]);

  const selected = patients.find((p) => p.id === selectedId);

  const sendMessage = async (templateKey?: string) => {
    if (!selectedId || (!message.trim() && !templateKey)) return;
    setIsSending(true);
    setShowTemplates(false);
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedId,
          ...(templateKey
            ? { templateKey, templateVars: { name: selected?.name ?? "", months: "6", link: "#", service: "consulta", time: "09:00", date: "próxima visita" } }
            : { message }),
        }),
      });
      toast.success("Mensagem enviada!");
      setMessage("");
      fetchPatients();
    } catch {
      toast.error("Erro ao enviar");
    } finally {
      setIsSending(false);
    }
  };

  const filtered = patients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">WhatsApp</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-black/60 dark:text-white/60 text-sm">Inbox centralizado de pacientes</p>
          <div className="flex items-center gap-1 text-xs font-medium text-black/40 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {process.env.NEXT_PUBLIC_EVOLUTION_API_URL ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3" />}
            {process.env.NEXT_PUBLIC_EVOLUTION_API_URL ? "Conectado" : "API não configurada"}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-1 gap-4 overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl min-h-[600px]">
        {/* Conversation List */}
        <div className="w-72 flex-shrink-0 border-r border-black/5 dark:border-white/5 flex flex-col">
          <div className="p-3 border-b border-black/5 dark:border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm text-black dark:text-white outline-none border border-transparent focus:border-black/15 dark:focus:border-white/15 placeholder:text-black/30 dark:placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((p) => {
              const lastMsg = p.messages[0];
              const unread = p.messages.filter((m) => m.direction === "INBOUND" && m.status !== "READ").length;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left border-b border-black/3 dark:border-white/3 ${selectedId === p.id ? "bg-black/5 dark:bg-white/5" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarGradient(p.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-black dark:text-white truncate">{p.name}</p>
                      {lastMsg && (
                        <span className="text-[10px] text-black/40 dark:text-white/40 flex-shrink-0">
                          {format(new Date(lastMsg.sentAt), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-black/50 dark:text-white/50 truncate">
                      {lastMsg ? lastMsg.content : p.phone}
                    </p>
                  </div>
                  {unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {unread}
                    </div>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-black/40 dark:text-white/40 pt-8">Nenhum paciente</p>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-black/30 dark:text-white/30">
              <MessageCircle className="h-12 w-12" />
              <p className="font-medium">Selecione um paciente para conversar</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-black/5 dark:border-white/5">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarGradient(selected.name)} flex items-center justify-center text-white font-bold text-xs`}>
                  {selected.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-black dark:text-white text-sm">{selected.name}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">{selected.phone}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selected.messages.length === 0 ? (
                  <p className="text-center text-sm text-black/40 dark:text-white/40 pt-8">Nenhuma mensagem ainda. Comece a conversa!</p>
                ) : (
                  [...selected.messages].reverse().map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${msg.direction === "OUTBOUND" ? "bg-green-500 text-white rounded-br-sm" : "bg-black/5 dark:bg-white/10 text-black dark:text-white rounded-bl-sm"}`}>
                        {msg.templateKey && (
                          <p className="text-[10px] font-bold opacity-70 mb-1 uppercase tracking-wider">{msg.templateKey.replace(/_/g, " ")}</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === "OUTBOUND" ? "text-white/60" : "text-black/40 dark:text-white/40"}`}>
                          <span className="text-[10px]">{format(new Date(msg.sentAt), "HH:mm", { locale: ptBR })}</span>
                          {msg.direction === "OUTBOUND" && <StatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-black/5 dark:border-white/5">
                {showTemplates && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => sendMessage(t.key)}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${showTemplates ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-black/5 dark:bg-white/10 text-black dark:text-white"}`}
                  >
                    Templates
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-black dark:text-white text-sm outline-none border border-transparent focus:border-black/15 dark:focus:border-white/15 placeholder:text-black/30 dark:placeholder:text-white/30"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={isSending || !message.trim()}
                    className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
