"use client";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Users, CalendarX, TrendingUp, Activity, DollarSign, Clock, CheckCircle2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type Appointment = {
  id: string; date: string; type: string; status: string;
  patient: { name: string }; doctor: { name: string; color: string } | null;
};

type FinancialData = {
  totalRevenue: number; totalExpenses: number; pending: number;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const CHART_TOOLTIP_STYLE = {
  borderRadius: "16px",
  border: "1px solid rgba(0,0,0,0.05)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  backgroundColor: "rgba(255,255,255,0.9)",
  color: "#000",
  fontSize: "12px",
};

const SERVICE_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

export default function CRMDashboard() {
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [financials, setFinancials] = useState<FinancialData>({ totalRevenue: 0, totalExpenses: 0, pending: 0 });
  const [weeklyData, setWeeklyData] = useState<{ date: string; consultas: number; faturamento: number }[]>([]);
  const [serviceDistribution, setServiceDistribution] = useState<{ name: string; value: number }[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [todayRes, finRes] = await Promise.all([
        fetch("/api/appointments?date=today"),
        fetch("/api/financial"),
      ]);
      const today: Appointment[] = await todayRes.json();
      const fin: FinancialData = await finRes.json();

      setTodayAppts(today);
      setFinancials(fin);

      // Next 3 upcoming appointments
      const nowTime = Date.now();
      const upcoming = today
        .filter((a) => new Date(a.date).getTime() > nowTime && ["PENDING", "CONFIRMED"].includes(a.status))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);
      setUpcomingAppts(upcoming);

      // Build 14-day weekly data
      const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
      const end = new Date();
      const start = subDays(end, 13);
      const rangeRes = await fetch(`/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}`);
      const rangeAppts: Appointment[] = await rangeRes.json();

      const daily = days.map((day) => {
        const dayStr = startOfDay(day).toISOString().split("T")[0];
        const dayAppts = rangeAppts.filter((a) => a.date.split("T")[0] === dayStr);
        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          consultas: dayAppts.length,
          faturamento: dayAppts.filter((a) => a.status === "ATTENDED").length * 250,
        };
      });
      setWeeklyData(daily);

      // Service distribution from today
      const typeCounts: Record<string, number> = {};
      rangeAppts.forEach((a) => {
        typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
      });
      setServiceDistribution(
        Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }))
      );

      setIsLoading(false);
    }
    load();
  }, []);

  const attended = todayAppts.filter((a) => a.status === "ATTENDED").length;
  const noShow = todayAppts.filter((a) => a.status === "NO_SHOW").length;
  const cancellationRate = todayAppts.length > 0
    ? ((todayAppts.filter((a) => ["NO_SHOW", "CANCELLED"].includes(a.status)).length / todayAppts.length) * 100).toFixed(1)
    : "0";

  const STATS = [
    { label: "Consultas Hoje", value: todayAppts.length.toString(), sub: `${attended} atendidos`, trend: "up", icon: Users },
    { label: "Atendimentos", value: attended.toString(), sub: `${noShow} faltas`, trend: attended > noShow ? "up" : "down", icon: CheckCircle2 },
    { label: "Faturamento Hoje", value: `R$ ${(attended * 250).toLocaleString("pt-BR")}`, sub: `R$ ${financials.pending.toLocaleString("pt-BR")} pendente`, trend: "up", icon: DollarSign },
    { label: "Taxa Cancelamento", value: `${cancellationRate}%`, sub: "hoje", trend: parseFloat(cancellationRate) < 5 ? "up" : "down", icon: CalendarX },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">Dashboard</h1>
        <p className="text-black/60 dark:text-white/60">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} · Melo Oftalmologia
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/[0.02] dark:to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-black/5 dark:bg-white/10 p-3 text-black dark:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${stat.trend === "up" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                    <TrendingUp className={`h-3.5 w-3.5 ${stat.trend === "down" ? "rotate-180" : ""}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-black/60 dark:text-white/60">{stat.label}</p>
                  {isLoading ? (
                    <div className="h-8 w-20 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse mt-1" />
                  ) : (
                    <div className="mt-0.5 text-2xl font-bold tracking-tight text-black dark:text-white">{stat.value}</div>
                  )}
                  <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{stat.sub}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="lg:col-span-2 rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-black dark:text-white">Fluxo — Últimas 2 Semanas</h2>
            <Activity className="h-4 w-4 text-black/30 dark:text-white/30" />
          </div>
          {isLoading ? (
            <div className="h-48 w-full rounded-2xl bg-black/3 dark:bg-white/3 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="rgba(0,0,0,0.15)" tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="transparent" tick={{ fill: "rgba(0,0,0,0.35)", fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="consultas" name="Consultas" stroke="#3B82F6" strokeWidth={2} fill="url(#colorConsultas)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Service Distribution */}
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
          <h2 className="text-base font-bold text-black dark:text-white mb-4">Top Serviços</h2>
          {isLoading ? (
            <div className="h-48 w-full rounded-2xl bg-black/3 dark:bg-white/3 animate-pulse" />
          ) : serviceDistribution.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-white/40">Sem dados</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={serviceDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {serviceDistribution.map((_, i) => (
                      <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {serviceDistribution.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SERVICE_COLORS[i % SERVICE_COLORS.length] }} />
                      <span className="text-black/60 dark:text-white/60 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-black dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Bar Chart */}
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
          <h2 className="text-base font-bold text-black dark:text-white mb-4">Faturamento Estimado (14 dias)</h2>
          {isLoading ? (
            <div className="h-40 w-full rounded-2xl bg-black/3 dark:bg-white/3 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData.slice(-7)} barSize={20}>
                <XAxis dataKey="date" stroke="rgba(0,0,0,0.15)" tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Faturamento"]} />
                <Bar dataKey="faturamento" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Upcoming 3 Hours */}
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 p-6 backdrop-blur-xl">
          <h2 className="text-base font-bold text-black dark:text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />Próximas Consultas
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-black/3 dark:bg-white/3 animate-pulse" />)}
            </div>
          ) : upcomingAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-black/30 dark:text-white/30">
              <CheckCircle2 className="h-8 w-8 mb-2" />
              <p className="text-sm">Sem consultas pendentes hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center text-center" style={{ backgroundColor: (a.doctor?.color ?? "#3B82F6") + "20" }}>
                    <span className="text-[10px] font-bold leading-none" style={{ color: a.doctor?.color ?? "#3B82F6" }}>
                      {format(new Date(a.date), "HH")}
                    </span>
                    <span className="text-[9px] leading-none opacity-70" style={{ color: a.doctor?.color ?? "#3B82F6" }}>
                      {format(new Date(a.date), "mm")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-black dark:text-white truncate">{a.patient.name}</p>
                    <p className="text-xs text-black/50 dark:text-white/50 truncate">{a.type}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === "CONFIRMED" ? "bg-green-500" : "bg-yellow-400"}`} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
