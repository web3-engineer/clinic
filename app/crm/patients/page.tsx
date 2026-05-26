"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus, X, UserRound, Phone, Heart, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  healthPlan: string | null;
  pipelineStatus: string;
  createdAt: string;
  appointments: { date: string; type: string; status: string }[];
  _count: { appointments: number; messages: number };
};

const PIPELINE_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  quote: { label: "Em Negociação", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  scheduled: { label: "Agendado", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  attended: { label: "Atendido", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  noshow: { label: "Faltou", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

function avatarGradient(name: string) {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-green-400 to-green-600",
    "from-orange-400 to-orange-600",
    "from-pink-400 to-pink-600",
    "from-teal-400 to-teal-600",
    "from-indigo-400 to-indigo-600",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    healthPlan: "",
    birthDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchPatients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/patients?${params}`);
    const data = await res.json();
    setPatients(data);
    setIsLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao criar paciente");
      toast.success("Paciente cadastrado!");
      setIsModalOpen(false);
      setForm({ name: "", phone: "", email: "", healthPlan: "", birthDate: "" });
      fetchPatients();
    } catch {
      toast.error("Erro ao cadastrar paciente");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">
            Pacientes
          </h1>
          <p className="text-black/60 dark:text-white/60">
            {patients.length} paciente{patients.length !== 1 ? "s" : ""} cadastrado{patients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.15)]"
        >
          <Plus className="h-4 w-4" />
          Novo Paciente
        </button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-[#0a0a0a]/50 border border-black/5 dark:border-white/5 backdrop-blur-xl text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none focus:border-black/20 dark:focus:border-white/20 transition-all"
        />
      </motion.div>

      {/* Patient Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {patients.map((patient) => {
            const lastAppt = patient.appointments[0];
            const stage = PIPELINE_LABELS[patient.pipelineStatus] ?? PIPELINE_LABELS.new;
            const initials = patient.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

            return (
              <motion.div key={patient.id} variants={itemVariants}>
                <Link href={`/crm/patients/${patient.id}`}>
                  <div className="group relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient(patient.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-black dark:text-white truncate">
                            {patient.name}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${stage.color}`}>
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-black/50 dark:text-white/50">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </div>
                        {patient.healthPlan && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-black/50 dark:text-white/50">
                            <Heart className="h-3 w-3" />
                            {patient.healthPlan}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-black/50 dark:text-white/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {patient._count.appointments} consulta{patient._count.appointments !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          {patient._count.messages} msg{patient._count.messages !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {lastAppt && (
                        <span className="text-[10px] text-black/40 dark:text-white/40">
                          Último: {format(new Date(lastAppt.date), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          {patients.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-black/40 dark:text-white/40">
              <UserRound className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">Nenhum paciente encontrado</p>
            </div>
          )}
        </motion.div>
      )}

      {/* New Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-3xl shadow-2xl p-6 border border-black/5 dark:border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black dark:text-white">Novo Paciente</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {[
                { key: "name", label: "Nome Completo", type: "text", required: true, placeholder: "Ex: Maria Santos" },
                { key: "phone", label: "Telefone / WhatsApp", type: "tel", required: true, placeholder: "(11) 90000-0000" },
                { key: "email", label: "E-mail", type: "email", required: false, placeholder: "paciente@email.com" },
                { key: "healthPlan", label: "Plano de Saúde", type: "text", required: false, placeholder: "Unimed, Particular..." },
                { key: "birthDate", label: "Data de Nascimento", type: "date", required: false, placeholder: "" },
              ].map(({ key, label, type, required, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white text-sm"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={isSaving}
                className="mt-2 w-full py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "Cadastrar Paciente"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
