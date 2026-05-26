"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Clock, Plus, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type FinancialRecord = {
  id: string; type: string; category: string; amount: number; status: string;
  date: string; description: string | null;
  patient: { id: string; name: string } | null;
};

const CHART_TOOLTIP_STYLE = {
  borderRadius: "14px", border: "1px solid rgba(0,0,0,0.05)",
  backdropFilter: "blur(12px)", backgroundColor: "rgba(255,255,255,0.9)",
  color: "#000", fontSize: "12px",
};

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function FinancialPage() {
  const [data, setData] = useState<{ records: FinancialRecord[]; totalRevenue: number; totalExpenses: number; pending: number }>({
    records: [], totalRevenue: 0, totalExpenses: 0, pending: 0,
  });
  const [weeklyData, setWeeklyData] = useState<{ label: string; receita: number; despesa: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ type: "receita", category: "consulta", amount: "", status: "pago", date: format(new Date(), "yyyy-MM-dd"), description: "" });
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const now = new Date();
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();
    const res = await fetch(`/api/financial?start=${start}&end=${end}`);
    const json = await res.json();
    setData(json);

    const weeks = eachWeekOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
    const wd = weeks.map((weekStart, i) => {
      const weekEnd = weeks[i + 1] ?? endOfMonth(now);
      const weekRecords = json.records.filter((r: FinancialRecord) => {
        const d = new Date(r.date);
        return d >= weekStart && d < weekEnd;
      });
      return {
        label: `S${i + 1}`,
        receita: weekRecords.filter((r: FinancialRecord) => r.type === "receita" && r.status === "pago").reduce((s: number, r: FinancialRecord) => s + r.amount, 0),
        despesa: weekRecords.filter((r: FinancialRecord) => r.type === "despesa" && r.status === "pago").reduce((s: number, r: FinancialRecord) => s + r.amount, 0),
      };
    });
    setWeeklyData(wd);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch("/api/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      toast.success("Lançamento registrado!");
      setIsModalOpen(false);
      setForm({ type: "receita", category: "consulta", amount: "", status: "pago", date: format(new Date(), "yyyy-MM-dd"), description: "" });
      load();
    } catch {
      toast.error("Erro ao registrar lançamento");
    } finally {
      setIsSaving(false);
    }
  };

  const profit = data.totalRevenue - data.totalExpenses;
  const goalMonthly = 20000;

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">Financeiro</h1>
          <p className="text-black/60 dark:text-white/60">{format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform">
          <Plus className="h-4 w-4" />Novo Lançamento
        </button>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receita", value: data.totalRevenue, icon: TrendingUp, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
          { label: "Despesas", value: data.totalExpenses, icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
          { label: "Lucro", value: profit, icon: DollarSign, color: profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400", bg: "bg-blue-500/10" },
          { label: "Pendente", value: data.pending, icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} variants={itemVariants} className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
              <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <p className="text-sm text-black/60 dark:text-white/60">{item.label}</p>
              {isLoading ? <div className="h-7 w-24 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse mt-1" /> : (
                <p className={`text-2xl font-bold mt-0.5 ${item.color}`}>
                  R$ {item.value.toLocaleString("pt-BR")}
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Progress bar */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm text-black dark:text-white">Meta Mensal</span>
          <span className="text-sm text-black/60 dark:text-white/60">
            R$ {data.totalRevenue.toLocaleString("pt-BR")} / R$ {goalMonthly.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((data.totalRevenue / goalMonthly) * 100, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
          />
        </div>
        <p className="text-xs text-black/40 dark:text-white/40 mt-1">{Math.min(Math.round((data.totalRevenue / goalMonthly) * 100), 100)}% da meta atingida</p>
      </motion.div>

      {/* Bar Chart */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
        <h2 className="text-base font-bold text-black dark:text-white mb-4">Receitas vs Despesas por Semana</h2>
        {isLoading ? <div className="h-40 rounded-2xl bg-black/3 dark:bg-white/3 animate-pulse" /> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} barSize={20} barGap={4}>
              <XAxis dataKey="label" stroke="rgba(0,0,0,0.15)" tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, String(name)]} />
              <Bar dataKey="receita" name="Receita" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Transactions Table */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
        <h2 className="text-base font-bold text-black dark:text-white mb-4">Lançamentos do Mês</h2>
        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl bg-black/3 animate-pulse" />)}</div>
        ) : data.records.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">Nenhum lançamento este mês</p>
        ) : (
          <div className="space-y-1">
            {data.records.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-black/3 dark:border-white/3 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-black dark:text-white capitalize truncate">{r.category}{r.patient && ` · ${r.patient.name}`}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">{format(new Date(r.date), "dd/MM/yyyy", { locale: ptBR })}{r.description && ` · ${r.description}`}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.status === "pago" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                    r.status === "pendente" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                    "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                  }`}>{r.status}</span>
                  <span className={`font-bold text-sm ${r.type === "receita" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {r.type === "receita" ? "+" : "-"}R$ {r.amount.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* New Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-3xl shadow-2xl p-6 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black dark:text-white">Novo Lançamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex gap-2">
                {["receita", "despesa"].map((t) => (
                  <button type="button" key={t} onClick={() => setForm({ ...form, type: t })} className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${form.type === t ? "bg-black dark:bg-white text-white dark:text-black" : "bg-black/5 dark:bg-white/5 text-black dark:text-white"}`}>{t}</button>
                ))}
              </div>
              {[
                { key: "amount", label: "Valor (R$)", type: "number", placeholder: "0,00", required: true },
                { key: "date", label: "Data", type: "date", placeholder: "", required: true },
              ].map(({ key, label, type, placeholder, required }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">{label}</label>
                  <input type={type} required={required} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white text-sm" />
                </div>
              ))}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">Categoria</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm">
                    {["consulta", "exame", "cirurgia", "material", "salário", "aluguel", "outros"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-black/60 dark:text-white/60">Descrição (opcional)</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notas..." className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm" />
              </div>
              <button type="submit" disabled={isSaving} className="mt-2 w-full py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                {isSaving ? "Salvando..." : "Registrar Lançamento"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
