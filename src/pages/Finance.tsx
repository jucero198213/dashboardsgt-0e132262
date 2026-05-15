import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import type { ContaPagar, ContaReceber } from "@/data/mockData";
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  FileBarChart, Building2, Tag, Landmark,
  TrendingDown, TrendingUp, Clock, CheckCircle,
  AlertTriangle, DollarSign, Wallet, BarChart3,
  Search, ChevronRight, ChevronLeft, Eye, Pencil,
  Banknote, Send, Download, Plus, FileSpreadsheet,
  ArrowRightLeft, Zap, Package, Bolt, Users,
  Truck, Flame, Wrench, Filter, ChevronDown,
  MapPin, Phone, Star, Mail, PanelLeftClose, PanelLeftOpen,
  MoreHorizontal, ArrowUpDown, Activity, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, ReferenceLine,
} from "recharts";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import sgtLogo from "@/assets/sgt-logo.png";
import { PartnersAnalytics, type PartnerRow } from "@/components/finance/PartnersAnalytics";
import { BankLogo } from "@/components/finance/BankLogo";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}k` : fmtBRL(v);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function agingDias(vencimento: string): number {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(vencimento); venc.setHours(0,0,0,0);
  return Math.floor((hoje.getTime() - venc.getTime()) / 86400000);
}

// Mapeia ContaPagar.status → label de exibição
function dsPagar(c: ContaPagar): string {
  if (c.status === "Parcial") return c.valorPago >= c.valor ? "Pago" : "Pago Parcial";
  if (c.status === "Vencido") return "Vencido";
  // Em Aberto
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(c.vencimento); venc.setHours(0,0,0,0);
  if (venc.getTime() < hoje.getTime()) return "Vencido";
  if (venc.getTime() === hoje.getTime()) return "Vence Hoje";
  return "Pendente";
}

// Mapeia ContaReceber.status → label de exibição
function dsReceber(c: ContaReceber): string {
  if (c.status === "Parcial") return c.valorRecebido >= c.valor ? "Recebido" : "Recebido Parcial";
  if (c.status === "Vencido") return "Em Atraso";
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(c.vencimento); venc.setHours(0,0,0,0);
  if (venc.getTime() < hoje.getTime()) return "Em Atraso";
  if (venc.getTime() === hoje.getTime()) return "Vence Hoje";
  return "Pendente";
}
function AgingBadge({ vencimento, displayStatus }: { vencimento: string; displayStatus: string }) {
  if (!["Em Atraso","Vencido"].includes(displayStatus)) return null;
  const dias = agingDias(vencimento);
  if (dias <= 0) return null;
  const cls = dias > 60 ? "bg-rose-400/15 text-rose-300" : dias > 30 ? "bg-rose-400/10 text-rose-400" : "bg-amber-400/10 text-amber-300";
  return <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cls}`}>+{dias}d</span>;
}

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────



const CONCILIACAO_BANCO = [
  { desc: "Pgto NF Petrobras", meta: "02/05/2025 · Débito automático", valor: -14320, status: "Conciliado" },
  { desc: "Receb. Transpolog", meta: "05/05/2025 · TED recebida", valor: 28400, status: "Conciliado" },
  { desc: "Tarifa bancária", meta: "07/05/2025 · Débito automático", valor: -48.90, status: "Sem par no ERP" },
  { desc: "Pgto Boleto Eletropaulo", meta: "08/05/2025 · Boleto bancário", valor: -3290, status: "Divergência" },
  { desc: "PIX recebido · RodoLog", meta: "10/05/2025 · PIX entrada", valor: 42000, status: "Conciliado" },
  { desc: "IOF · CDB automático", meta: "11/05/2025 · Lançamento automático", valor: -127.40, status: "Sem par no ERP" },
];

const CONCILIACAO_ERP = [
  { desc: "Pgto NF-004821 · Petrobras", meta: "02/05/2025 · Conta a pagar", valor: -14320, status: "Conciliado" },
  { desc: "Receb. NF-008812 · Transpolog", meta: "05/05/2025 · Conta a receber", valor: 28400, status: "Conciliado" },
  { desc: "Pgto BOL-104412 · Eletropaulo", meta: "08/05/2025 · Conta a pagar", valor: -3350, status: "Divergência R$ 60" },
  { desc: "Receb. BOL-041200 · RodoLog", meta: "10/05/2025 · Conta a receber", valor: 42000, status: "Conciliado" },
  { desc: "Despesa combustível", meta: "09/05/2025 · Lançamento manual", valor: -4800, status: "Sem par bancário" },
  { desc: "Pgto CTR-003312 · SASCAR", meta: "12/05/2025 · Conta a pagar", valor: -4200, status: "Pendente" },
];

// ─── STATUS BADGE CONFIG ───────────────────────────────────────────────────────
function statusCfg(s: string) {
  if (s === "Vencido" || s === "Em Atraso")   return { dot: "bg-rose-400",    text: "text-rose-300",    bg: "bg-rose-400/10 border-rose-400/20" };
  if (s === "Vence Hoje")                      return { dot: "bg-blue-400",    text: "text-blue-300",    bg: "bg-blue-400/10 border-blue-400/20" };
  if (s === "Pendente")                        return { dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-400/10 border-amber-400/20" };
  if (s === "Pago" || s === "Recebido")        return { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" };
  if (s === "Pago Parcial" || s === "Recebido Parcial") return { dot: "bg-teal-400", text: "text-teal-300", bg: "bg-teal-400/10 border-teal-400/20" };
  if (s === "Ativo")     return { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" };
  if (s === "Bloqueado") return { dot: "bg-rose-400",    text: "text-rose-300",    bg: "bg-rose-400/10 border-rose-400/20" };
  if (s === "Inativo")   return { dot: "bg-slate-400",   text: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" };
  if (s === "Conciliado")   return { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" };
  if (s === "Divergência" || s.startsWith("Divergência")) return { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-400/10 border-rose-400/20" };
  if (s.includes("Sem par")) return { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/20" };
  return { dot: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" };
}

function StatusBadge({ s }: { s: string }) {
  const c = statusCfg(s);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {s}
    </span>
  );
}

// ─── AVATAR ────────────────────────────────────────────────────────────────────
const AV_COLORS: Record<string, string> = {
  PE: "bg-blue-400/10 border-blue-400/20 text-blue-300",
  CO: "bg-teal-400/10 border-teal-400/20 text-teal-300",
  SC: "bg-violet-400/10 border-violet-400/20 text-violet-300",
  BR: "bg-amber-400/10 border-amber-400/20 text-amber-300",
  OM: "bg-rose-400/10 border-rose-400/20 text-rose-300",
  EL: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
  PR: "bg-blue-400/10 border-blue-400/20 text-blue-300",
  MF: "bg-slate-400/10 border-slate-400/20 text-slate-400",
};
function Avatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const cls = AV_COLORS[initials] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400";
  const dim = size === "lg" ? "h-10 w-10 text-[12px]" : size === "md" ? "h-8 w-8 text-[11px]" : "h-6 w-6 text-[9px]";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border font-semibold ${cls} ${dim}`}>
      {initials}
    </span>
  );
}

// ─── SHARED: CARD SECTION WRAPPER ─────────────────────────────────────────────
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[14px] border bg-[var(--sgt-bg-card)] border-[var(--sgt-border-subtle)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SkeletonLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-600">
      <div className="h-8 w-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
      {label && <p className="text-[12px] font-medium">{label}</p>}
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, stripe, iconBg, iconTxt, glow, delay = 0 }: {
  label: string; value: string; sub: string;
  icon: React.ElementType; stripe: string; iconBg: string; iconTxt: string; glow: string; delay?: number;
}) {
  return (
    <AnimatedCard delay={delay}>
      <div className={`group relative flex min-h-[110px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 transition-all duration-300 hover:-translate-y-[3px] ${glow} shadow-[0_2px_20px_rgba(0,0,0,0.35)]`}>
        <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${stripe}`} />
        <div className="flex items-start justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 leading-tight">{label}</p>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconBg} ${iconTxt}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1.3rem,2.2vw,1.7rem)] overflow-hidden text-ellipsis whitespace-nowrap">{value}</p>
        <p className="mt-2 text-[10px] font-medium tracking-[0.1em] text-slate-500">{sub}</p>
      </div>
    </AnimatedCard>
  );
}

// ─── TABLE HEADER ROW ──────────────────────────────────────────────────────────
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 bg-[var(--sgt-table-head)] ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-3 py-2.5 text-[12px] text-slate-300 align-middle border-t border-[var(--sgt-divider)] ${className}`}>
      {children}
    </td>
  );
}

// ─── ACTION BTN ───────────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <button title={title} className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] bg-transparent text-slate-500 transition-colors hover:border-[var(--sgt-border-medium)] hover:text-slate-300">
      <Icon className="h-3 w-3" />
    </button>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({ search, onSearch, children }: { search: string; onSearch: (v: string) => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-3 py-2 mb-3">
      <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Buscar..."
        className="flex-1 min-w-[140px] bg-transparent text-[12px] text-slate-300 placeholder:text-slate-600 outline-none"
      />
      {children}
    </div>
  );
}

// ─── CONCILIATION STATUS ──────────────────────────────────────────────────────
function ConcStatus({ s }: { s: string }) {
  const c = statusCfg(s);
  return <span className={`text-[11px] font-semibold ${c.text}`}>{s}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function ScreenPainel({ onNavigate }: { onNavigate?: (id: ScreenId) => void }) {
  const { contasPagar, contasReceber, resumo, dwRawData, filiais, isFetchingDw } = useFinancialData();

  const totalPagar   = resumo.contasPagar.saldoAPagar;
  const totalReceber = resumo.contasReceber.saldoAReceber;
  const saldo        = totalReceber - totalPagar;

  // Movimentação bancária líquida do período (LB_C - LB_D)
  const lbRows = dwRawData.filter(r => r.ORIGEM === "LB_C" || r.ORIGEM === "LB_D");
  const saldoBancos = lbRows.reduce((s, r) => {
    const val = Math.abs(r.VLRDOC ?? r.VLR_PARCELA ?? 0);
    return r.ORIGEM === "LB_C" ? s + val : s - val;
  }, 0);
  const nFiliais = new Set(lbRows.map(r => r.FILIAL).filter(Boolean)).size;

  const vencidosPagar     = contasPagar.filter(c => dsPagar(c) === "Vencido").reduce((s,c) => s+c.valor, 0);
  const atrasadosReceber  = contasReceber.filter(c => dsReceber(c) === "Em Atraso").reduce((s,c) => s+c.valor, 0);

  const kpis = [
    { label: "Movimentação Bancos", value: fmtK(saldoBancos), sub: `${nFiliais || 0} filial${nFiliais !== 1 ? "is" : ""} · período`,                             icon: Landmark,     stripe: "from-cyan-400/60 to-cyan-700/20",    iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]"   },
    { label: "A Pagar (abertas)",  value: fmtK(totalPagar),          sub: `${contasPagar.filter(c => dsPagar(c) !== "Pago").length} títulos`,   icon: TrendingDown, stripe: "from-rose-400/60 to-rose-700/20",    iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]"   },
    { label: "A Receber (abertas)",value: fmtK(totalReceber),        sub: `${contasReceber.filter(c => dsReceber(c) !== "Recebido").length} títulos`, icon: TrendingUp, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]"  },
    { label: "Resultado Líquido",  value: fmtK(Math.abs(saldo)),     sub: saldo >= 0 ? "Posição favorável" : "Posição desfavorável",     icon: BarChart3,    stripe: "from-amber-400/60 to-amber-700/20",  iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",  iconTxt: "text-amber-300",   glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]"  },
  ];

  if (isFetchingDw) return <SkeletonLoader label="Carregando painel financeiro..." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {(vencidosPagar > 0 || atrasadosReceber > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vencidosPagar > 0 && (
            <AnimatedCard delay={250}>
              <div className="flex items-center gap-3 rounded-[12px] border border-rose-400/20 bg-rose-400/[0.06] p-3 cursor-pointer hover:bg-rose-400/[0.09] transition-colors" onClick={() => onNavigate?.("pagar")}>
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-rose-300">Títulos vencidos a pagar</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{contasPagar.filter(c => dsPagar(c) === "Vencido").length} títulos · {fmtBRL(vencidosPagar)}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-rose-400/50 shrink-0" />
              </div>
            </AnimatedCard>
          )}
          {atrasadosReceber > 0 && (
            <AnimatedCard delay={300}>
              <div className="flex items-center gap-3 rounded-[12px] border border-amber-400/20 bg-amber-400/[0.06] p-3 cursor-pointer hover:bg-amber-400/[0.09] transition-colors" onClick={() => onNavigate?.("receber")}>
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-amber-300">Clientes em atraso</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{contasReceber.filter(c => dsReceber(c) === "Em Atraso").length} clientes · {fmtBRL(atrasadosReceber)}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-amber-400/50 shrink-0" />
              </div>
            </AnimatedCard>
          )}
        </div>
      )}

      <AnimatedCard delay={320}>
        <SectionCard>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
            <div>
              <span className="text-[12px] font-semibold text-slate-300">Fluxo de Caixa</span>
              <span className="ml-2 text-[10px] text-slate-600">Previsto vs Realizado</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 rounded-full bg-emerald-400/70" />A Receber</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-px w-4 border-t-2 border-dashed border-rose-400/50" />A Pagar</span>
            </div>
          </div>
          <div className="px-2 py-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  const map: Record<string, { mes: string; pagar: number; receber: number }> = {};
                  [...contasPagar, ...contasReceber].forEach(r => {
                    const d = (r as any).vencimento || "";
                    if (!d) return;
                    const mes = d.slice(0,7);
                    if (!map[mes]) map[mes] = { mes: new Date(d).toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}), pagar: 0, receber: 0 };
                    if ("fornecedor" in r) map[mes].pagar  += (r as ContaPagar).valor;
                    else                  map[mes].receber += (r as ContaReceber).valor;
                  });
                  return Object.values(map).slice(-6);
                })()}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} width={32} />
                <Tooltip formatter={(v:any, n:string) => [fmtK(v), n === "receber" ? "A Receber" : "A Pagar"]} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="receber" fill="#34d399" fillOpacity={0.75} radius={[3,3,0,0]} />
                <Bar dataKey="pagar"   fill="#fb7185" fillOpacity={0.75} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </AnimatedCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={380}>
          <SectionCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><ArrowDownCircle className="h-3.5 w-3.5 text-rose-400" />Próximos vencimentos a pagar</span>
              <button onClick={() => onNavigate?.("pagar")} className="text-[10px] text-slate-600 hover:text-amber-300 transition-colors flex items-center gap-0.5">Ver todos <ChevronRight className="h-3 w-3" /></button>
            </div>
            {contasPagar.filter(c => ["Pendente","Vence Hoje","Vencido"].includes(dsPagar(c))).slice(0,5).map((c,i) => {
              const st = dsPagar(c);
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                  <Avatar initials={c.fornecedor.slice(0,2).toUpperCase()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-300 truncate">{c.fornecedor}</p>
                    <p className="text-[10px] text-slate-600">{fmtDate(c.vencimento)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-semibold text-white tabular-nums">{fmtK(c.valor)}</p>
                    <StatusBadge s={st} />
                  </div>
                </div>
              );
            })}
            {contasPagar.length === 0 && <p className="px-4 py-6 text-center text-[12px] text-slate-600">Sem títulos no período</p>}
          </SectionCard>
        </AnimatedCard>

        <AnimatedCard delay={420}>
          <SectionCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />Próximos recebimentos</span>
              <button onClick={() => onNavigate?.("receber")} className="text-[10px] text-slate-600 hover:text-amber-300 transition-colors flex items-center gap-0.5">Ver todos <ChevronRight className="h-3 w-3" /></button>
            </div>
            {contasReceber.filter(c => ["Pendente","Vence Hoje","Em Atraso"].includes(dsReceber(c))).slice(0,5).map((c,i) => {
              const st = dsReceber(c);
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                  <Avatar initials={c.cliente.slice(0,2).toUpperCase()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-300 truncate">{c.cliente}</p>
                    <p className="text-[10px] text-slate-600">{fmtDate(c.vencimento)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-semibold text-white tabular-nums">{fmtK(c.valor)}</p>
                    <StatusBadge s={st} />
                  </div>
                </div>
              );
            })}
            {contasReceber.length === 0 && <p className="px-4 py-6 text-center text-[12px] text-slate-600">Sem títulos no período</p>}
          </SectionCard>
        </AnimatedCard>
      </div>

      <AnimatedCard delay={460}>
        <SectionCard>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
            <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-cyan-400" />Movimentação por filial</span>
            <button onClick={() => onNavigate?.("bancos")} className="text-[10px] text-slate-600 hover:text-amber-300 transition-colors flex items-center gap-0.5">Ver extrato <ChevronRight className="h-3 w-3" /></button>
          </div>
          {lbRows.length === 0 ? (
            <p className="px-4 py-4 text-[11px] text-slate-600 text-center">Sem lançamentos bancários no período</p>
          ) : (
            <div className="grid divide-x divide-[var(--sgt-divider)]" style={{ gridTemplateColumns: `repeat(${Math.min(nFiliais || 1, 4)}, 1fr)` }}>
              {(() => {
                const byFilial = new Map<string, number>();
                lbRows.forEach(r => {
                  const k = r.FILIAL ?? "—";
                  const v = Math.abs(r.VLRDOC ?? r.VLR_PARCELA ?? 0);
                  byFilial.set(k, (byFilial.get(k) ?? 0) + (r.ORIGEM === "LB_C" ? v : -v));
                });
                return Array.from(byFilial.entries()).slice(0, 4).map(([cod, liq]) => {
                  const nome = filiais.find(f => f.id === cod)?.nome ?? cod;
                  return (
                    <div key={cod} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-black border border-amber-400/20 bg-[var(--sgt-table-head)]">{nome.slice(0,2).toUpperCase()}</span>
                        <span className="text-[10px] text-slate-600 truncate">{nome}</span>
                      </div>
                      <p className={`text-[15px] font-black leading-none tabular-nums ${liq >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{fmtK(liq)}</p>
                      <p className="text-[10px] text-slate-600 mt-1">Líquido</p>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}

function ScreenPagar() {
  const { contasPagar, resumo, isFetchingDw } = useFinancialData();
  const [search, setSearch] = useState("");
  const [filtroAba, setFiltroAba] = useState("todos");
  const [page, setPage] = useState(1);
  const PAGE = 30;

  const today = new Date(); today.setHours(0,0,0,0);

  const totalPagar   = resumo.contasPagar.saldoAPagar;
  const vencido      = contasPagar.filter(c => dsPagar(c) === "Vencido").reduce((s,c) => s+c.valor, 0);
  const hojeVal      = contasPagar.filter(c => dsPagar(c) === "Vence Hoje").reduce((s,c) => s+c.valor, 0);
  const pago         = resumo.contasPagar.valorPago;

  const ABAS = [
    { id: "todos",       label: "Todos",      count: contasPagar.length },
    { id: "Vencido",     label: "Vencidos",   count: contasPagar.filter(c => dsPagar(c) === "Vencido").length },
    { id: "Vence Hoje",  label: "Vence Hoje", count: contasPagar.filter(c => dsPagar(c) === "Vence Hoje").length },
    { id: "a-vencer",    label: "A Vencer",   count: contasPagar.filter(c => dsPagar(c) === "Pendente").length },
    { id: "Pago",        label: "Pagos",      count: contasPagar.filter(c => ["Pago","Pago Parcial"].includes(dsPagar(c))).length },
  ];

  const filtered = useMemo(() => contasPagar.filter(c => {
    const q = search.toLowerCase();
    const st = dsPagar(c);
    const matchQ = !q || c.fornecedor.toLowerCase().includes(q) || (c.documento ?? "").toLowerCase().includes(q);
    let matchAba = true;
    if (filtroAba === "a-vencer")   matchAba = st === "Pendente";
    else if (filtroAba === "Pago")  matchAba = ["Pago","Pago Parcial"].includes(st);
    else if (filtroAba !== "todos") matchAba = st === filtroAba;
    return matchQ && matchAba;
  }), [contasPagar, search, filtroAba]);

  const paginated = filtered.slice((page-1)*PAGE, page*PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const kpis = [
    { label: "Total a Pagar", value: fmtK(totalPagar), sub: `${contasPagar.filter(c => dsPagar(c) !== "Pago").length} títulos em aberto`, icon: Wallet,        stripe: "from-blue-400/60 to-blue-700/20",    iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]",    iconTxt: "text-blue-300",    glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]"   },
    { label: "Vencido",       value: fmtK(vencido),    sub: `${contasPagar.filter(c => dsPagar(c) === "Vencido").length} títulos em atraso`, icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20",    iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]"   },
    { label: "Vence Hoje",    value: fmtK(hojeVal),    sub: `${contasPagar.filter(c => dsPagar(c) === "Vence Hoje").length} títulos para hoje`, icon: Clock,      stripe: "from-amber-400/60 to-amber-700/20",  iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",  iconTxt: "text-amber-300",   glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]"  },
    { label: "Pago no Mês",   value: fmtK(pago),       sub: `${contasPagar.filter(c => ["Pago","Pago Parcial"].includes(dsPagar(c))).length} títulos quitados`, icon: CheckCircle, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
  ];

  if (isFetchingDw) return <SkeletonLoader label="Carregando contas a pagar..." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* Gráficos aging + top fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AnimatedCard delay={160}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Aging — Títulos a Pagar</span>
              <span className="ml-2 text-[10px] text-slate-600">Vencidos por faixa de dias</span>
            </div>
            <div className="px-2 py-3" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { faixa: "1–30d",    valor: contasPagar.filter(c => { const d = agingDias(c.vencimento); return dsPagar(c) === "Vencido" && d >= 1  && d <= 30; }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "31–60d",   valor: contasPagar.filter(c => { const d = agingDias(c.vencimento); return dsPagar(c) === "Vencido" && d >= 31 && d <= 60; }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "61–90d",   valor: contasPagar.filter(c => { const d = agingDias(c.vencimento); return dsPagar(c) === "Vencido" && d >= 61 && d <= 90; }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "90d+",     valor: contasPagar.filter(c => { const d = agingDias(c.vencimento); return dsPagar(c) === "Vencido" && d  > 90;           }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "Pendente", valor: contasPagar.filter(c => dsPagar(c) === "Pendente").reduce((s,c)=>s+c.valor,0) },
                    { faixa: "V. Hoje",  valor: contasPagar.filter(c => dsPagar(c) === "Vence Hoje").reduce((s,c)=>s+c.valor,0) },
                  ]}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} width={30} />
                  <Tooltip formatter={(v:any) => fmtK(v)} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="valor" name="Valor" radius={[4,4,0,0]}>
                    {["1–30d","31–60d","61–90d","90d+","Pendente","V. Hoje"].map((f) => (
                      <Cell key={f} fill={f==="1–30d"?"#fbbf24":f==="31–60d"?"#f97316":f==="61–90d"?"#ef4444":f==="90d+"?"#991b1b":f==="Pendente"?"#60a5fa":"#a78bfa"} fillOpacity={0.82} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </AnimatedCard>
        <AnimatedCard delay={200}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Top Fornecedores</span>
              <span className="ml-2 text-[10px] text-slate-600">Por valor total em aberto</span>
            </div>
            <div className="px-2 py-3" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical"
                  data={Object.entries(
                    contasPagar.filter(c => !["Pago","Pago Parcial"].includes(dsPagar(c))).reduce((acc,c) => {
                      const k = c.fornecedor.split(" ").slice(0,2).join(" ");
                      acc[k] = (acc[k] || 0) + c.valor; return acc;
                    }, {} as Record<string,number>)
                  ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nome,valor])=>({nome,valor}))}
                  margin={{ top: 4, right: 14, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={92} />
                  <Tooltip formatter={(v:any) => fmtK(v)} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="valor" name="Em aberto" fill="#fbbf24" fillOpacity={0.75} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </AnimatedCard>
      </div>

      <FilterBar search={search} onSearch={v => { setSearch(v); setPage(1); }} />

      <AnimatedCard delay={200}>
        <SectionCard>
          <div className="flex items-center gap-0 px-4 pt-3 border-b border-[var(--sgt-divider)] overflow-x-auto">
            {ABAS.map(a => (
              <button key={a.id} onClick={() => { setFiltroAba(a.id); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                  filtroAba === a.id ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
                {a.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${filtroAba === a.id ? "bg-amber-400/15 text-amber-300" : "bg-[var(--sgt-table-head)] text-slate-600"}`}>{a.count}</span>
              </button>
            ))}
            <button className="ml-auto mb-2 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors shrink-0"><Download className="h-3 w-3" /> Exportar</button>
          </div>
          <div className="px-4 py-2 border-b border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-500">{filtered.length} títulos encontrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr>
                <Th>Fornecedor</Th><Th>Documento</Th><Th>Emissão</Th><Th>Vencimento</Th><Th>Valor</Th><Th>Status</Th><Th>Ações</Th>
              </tr></thead>
              <tbody>
                {paginated.map(c => {
                  const st = dsPagar(c);
                  return (
                    <tr key={c.id} className="hover:bg-[var(--sgt-row-hover)] transition-colors">
                      <Td>
                        <div className="flex items-center gap-2">
                          <Avatar initials={c.fornecedor.slice(0,2).toUpperCase()} />
                          <p className="font-medium text-slate-200 text-[12px] truncate max-w-[140px]">{c.fornecedor}</p>
                        </div>
                      </Td>
                      <Td className="font-mono text-[11px] text-slate-500">{c.documento}{c.parcela ? `/${c.parcela}` : ""}</Td>
                      <Td className="text-slate-500">{fmtDate(c.dataEmissao)}</Td>
                      <Td className={st === "Vencido" ? "font-semibold text-rose-300" : st === "Vence Hoje" ? "font-semibold text-blue-300" : "text-slate-400"}>{fmtDate(c.vencimento)}</Td>
                      <Td className={`font-semibold tabular-nums ${st === "Vencido" ? "text-rose-300" : st === "Vence Hoje" ? "text-blue-300" : "text-white"}`}>{fmtBRL(c.valor)}</Td>
                      <Td><StatusBadge s={st} /></Td>
                      <Td><div className="flex gap-1"><ActionBtn icon={Banknote} title="Registrar pagamento" /><ActionBtn icon={Eye} title="Detalhes" /></div></Td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-600 text-[12px]">Nenhum título encontrado</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-600">{(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={() => setPage(n)} className={`h-7 w-7 rounded-md text-[11px] font-medium transition-colors ${n===page?"bg-amber-500/20 border border-amber-500/40 text-amber-300":"border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}

function ScreenReceber() {
  const { contasReceber, resumo, isFetchingDw } = useFinancialData();
  const [search, setSearch] = useState("");
  const [filtroAba, setFiltroAba] = useState("todos");
  const [page, setPage] = useState(1);
  const PAGE = 30;

  const totalReceber = resumo.contasReceber.saldoAReceber;
  const emAtraso     = contasReceber.filter(c => dsReceber(c) === "Em Atraso").reduce((s,c) => s+c.valor, 0);
  const previsto     = contasReceber.filter(c => ["Pendente","Vence Hoje"].includes(dsReceber(c))).reduce((s,c) => s+c.valor, 0);
  const recebido     = resumo.contasReceber.valorRecebido;

  const ABAS = [
    { id: "todos",      label: "Todos",      count: contasReceber.length },
    { id: "Em Atraso",  label: "Em Atraso",  count: contasReceber.filter(c => dsReceber(c) === "Em Atraso").length },
    { id: "Vence Hoje", label: "Vence Hoje", count: contasReceber.filter(c => dsReceber(c) === "Vence Hoje").length },
    { id: "a-vencer",   label: "A Vencer",   count: contasReceber.filter(c => dsReceber(c) === "Pendente").length },
    { id: "Recebido",   label: "Recebidos",  count: contasReceber.filter(c => ["Recebido","Recebido Parcial"].includes(dsReceber(c))).length },
  ];

  const filtered = useMemo(() => contasReceber.filter(c => {
    const q = search.toLowerCase();
    const st = dsReceber(c);
    const matchQ = !q || c.cliente.toLowerCase().includes(q) || (c.documento ?? "").toLowerCase().includes(q);
    let matchAba = true;
    if (filtroAba === "a-vencer")   matchAba = st === "Pendente";
    else if (filtroAba === "Recebido") matchAba = ["Recebido","Recebido Parcial"].includes(st);
    else if (filtroAba !== "todos") matchAba = st === filtroAba;
    return matchQ && matchAba;
  }), [contasReceber, search, filtroAba]);

  const paginated = filtered.slice((page-1)*PAGE, page*PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const kpis = [
    { label: "Total a Receber",  value: fmtK(totalReceber), sub: `${contasReceber.filter(c => !["Recebido","Recebido Parcial"].includes(dsReceber(c))).length} títulos em aberto`, icon: TrendingUp,   stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]"  },
    { label: "Em Atraso",        value: fmtK(emAtraso),     sub: `${contasReceber.filter(c => dsReceber(c) === "Em Atraso").length} clientes inadimplentes`,  icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20",    iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]"   },
    { label: "Previsto no Mês",  value: fmtK(previsto),     sub: `${contasReceber.filter(c => ["Pendente","Vence Hoje"].includes(dsReceber(c))).length} vencimentos`,            icon: Clock,         stripe: "from-blue-400/60 to-blue-700/20",    iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]",    iconTxt: "text-blue-300",    glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]"  },
    { label: "Recebido no Mês",  value: fmtK(recebido),     sub: `${contasReceber.filter(c => ["Recebido","Recebido Parcial"].includes(dsReceber(c))).length} títulos liquidados`, icon: CheckCircle,  stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
  ];

  if (isFetchingDw) return <SkeletonLoader label="Carregando contas a receber..." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* Gráficos aging + top clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AnimatedCard delay={160}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Aging — Títulos a Receber</span>
              <span className="ml-2 text-[10px] text-slate-600">Em atraso por faixa de dias</span>
            </div>
            <div className="px-2 py-3" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { faixa: "1–30d",    valor: contasReceber.filter(c => { const d = agingDias(c.vencimento); return dsReceber(c) === "Em Atraso" && d >= 1  && d <= 30; }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "31–60d",   valor: contasReceber.filter(c => { const d = agingDias(c.vencimento); return dsReceber(c) === "Em Atraso" && d >= 31 && d <= 60; }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "61–90d",   valor: contasReceber.filter(c => { const d = agingDias(c.vencimento); return dsReceber(c) === "Em Atraso" && d >= 61 && d <= 90; }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "90d+",     valor: contasReceber.filter(c => { const d = agingDias(c.vencimento); return dsReceber(c) === "Em Atraso" && d  > 90;           }).reduce((s,c)=>s+c.valor,0) },
                    { faixa: "Pendente", valor: contasReceber.filter(c => dsReceber(c) === "Pendente").reduce((s,c)=>s+c.valor,0) },
                    { faixa: "V. Hoje",  valor: contasReceber.filter(c => dsReceber(c) === "Vence Hoje").reduce((s,c)=>s+c.valor,0) },
                  ]}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} width={30} />
                  <Tooltip formatter={(v:any) => fmtK(v)} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="valor" name="Valor" radius={[4,4,0,0]}>
                    {["1–30d","31–60d","61–90d","90d+","Pendente","V. Hoje"].map((f) => (
                      <Cell key={f} fill={f==="1–30d"?"#fbbf24":f==="31–60d"?"#f97316":f==="61–90d"?"#ef4444":f==="90d+"?"#991b1b":f==="Pendente"?"#34d399":"#a78bfa"} fillOpacity={0.82} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </AnimatedCard>
        <AnimatedCard delay={200}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Top Clientes</span>
              <span className="ml-2 text-[10px] text-slate-600">Por valor total a receber</span>
            </div>
            <div className="px-2 py-3" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical"
                  data={Object.entries(
                    contasReceber.filter(c => !["Recebido","Recebido Parcial"].includes(dsReceber(c))).reduce((acc,c) => {
                      const k = c.cliente.split(" ").slice(0,2).join(" ");
                      acc[k] = (acc[k] || 0) + c.valor; return acc;
                    }, {} as Record<string,number>)
                  ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nome,valor])=>({nome,valor}))}
                  margin={{ top: 4, right: 14, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={92} />
                  <Tooltip formatter={(v:any) => fmtK(v)} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="valor" name="A receber" fill="#34d399" fillOpacity={0.75} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </AnimatedCard>
      </div>

      <FilterBar search={search} onSearch={v => { setSearch(v); setPage(1); }} />

      <AnimatedCard delay={200}>
        <SectionCard>
          <div className="flex items-center gap-0 px-4 pt-3 border-b border-[var(--sgt-divider)] overflow-x-auto">
            {ABAS.map(a => (
              <button key={a.id} onClick={() => { setFiltroAba(a.id); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                  filtroAba === a.id ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
                {a.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${filtroAba === a.id ? "bg-emerald-400/15 text-emerald-300" : "bg-[var(--sgt-table-head)] text-slate-600"}`}>{a.count}</span>
              </button>
            ))}
            <div className="ml-auto mb-2 flex gap-3 shrink-0">
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"><Send className="h-3 w-3" /> Cobrar</button>
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"><Download className="h-3 w-3" /> Exportar</button>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-500">{filtered.length} títulos encontrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr>
                <Th>Cliente</Th><Th>Documento</Th><Th>Emissão</Th><Th>Vencimento</Th><Th>Valor</Th><Th>Status</Th><Th>Ações</Th>
              </tr></thead>
              <tbody>
                {paginated.map(c => {
                  const st = dsReceber(c);
                  return (
                    <tr key={c.id} className="hover:bg-[var(--sgt-row-hover)] transition-colors">
                      <Td>
                        <div className="flex items-center gap-2">
                          <Avatar initials={c.cliente.slice(0,2).toUpperCase()} />
                          <p className="font-medium text-slate-200 text-[12px] truncate max-w-[140px]">{c.cliente}</p>
                        </div>
                      </Td>
                      <Td className="font-mono text-[11px] text-slate-500">{c.documento}{c.parcela ? `/${c.parcela}` : ""}</Td>
                      <Td className="text-slate-500">{fmtDate(c.dataEmissao)}</Td>
                      <Td className={st === "Em Atraso" ? "font-semibold text-rose-300" : "text-slate-400"}>
                        {fmtDate(c.vencimento)}<AgingBadge vencimento={c.vencimento} displayStatus={st} />
                      </Td>
                      <Td className={`font-semibold tabular-nums ${st === "Em Atraso" ? "text-rose-300" : st === "Vence Hoje" ? "text-blue-300" : st === "Recebido" ? "text-emerald-300" : "text-white"}`}>{fmtBRL(c.valor)}</Td>
                      <Td><StatusBadge s={st} /></Td>
                      <Td><div className="flex gap-1"><ActionBtn icon={Send} title="Enviar cobrança" /><ActionBtn icon={Eye} title="Detalhes" /></div></Td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-600 text-[12px]">Nenhum título encontrado</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-600">{(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={() => setPage(n)} className={`h-7 w-7 rounded-md text-[11px] font-medium transition-colors ${n===page?"bg-emerald-500/20 border border-emerald-500/40 text-emerald-300":"border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}

function ScreenConciliacao() {
  const taxa = 88.6;
  const [checkedBanco, setCheckedBanco] = useState<Record<number,boolean>>({});
  const [checkedErp, setCheckedErp] = useState<Record<number,boolean>>({});
  const totalChecked = Object.values(checkedBanco).filter(Boolean).length + Object.values(checkedErp).filter(Boolean).length;

  function concStatusIcon(s: string) {
    if (s === "Conciliado") return <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />;
    if (s === "Divergência" || s.startsWith("Divergência")) return <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />;
    if (s.includes("Sem par")) return <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />;
    return <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Lançamentos Banco", value: "247", sub: "Maio 2025", icon: Landmark, stripe: "from-blue-400/60 to-blue-700/20", iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]", iconTxt: "text-blue-300", glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]" },
          { label: "Conciliados", value: "219", sub: "88,6% do total", icon: CheckCircle, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
          { label: "Divergências", value: "28", sub: "Requer atenção", icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
        ].map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* Barra de ações + taxa */}
      <AnimatedCard delay={200}>
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-4 py-3">
          <span className="text-[12px] font-semibold text-slate-400 shrink-0">Taxa de conciliação</span>
          <div className="flex-1 min-w-[80px] h-2 rounded-full bg-[var(--sgt-progress-track)] overflow-hidden">
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${taxa}%`, transition: "width 1s ease" }} />
          </div>
          <span className="text-[13px] font-black text-emerald-300 shrink-0">{taxa}%</span>
          <div className="h-4 w-px bg-[var(--sgt-divider)] hidden sm:block" />
          {/* Botões de ação */}
          <button
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors border ${
              totalChecked > 0
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-[var(--sgt-input-bg)] border-[var(--sgt-border-subtle)] text-slate-500 opacity-50 cursor-default"
            }`}>
            <CheckCircle className="h-3 w-3" />
            Confirmar selecionados{totalChecked > 0 ? ` (${totalChecked})` : ""}
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-400/[0.14] transition-colors">
            <AlertTriangle className="h-3 w-3" />
            Ver divergências (28)
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-300 transition-colors">
            <FileSpreadsheet className="h-3 w-3" />
            Relatório de conciliação
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-300 transition-colors">
            <ArrowRightLeft className="h-3 w-3" />Conciliar Auto
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-300 transition-colors">
            <Download className="h-3 w-3" />Importar OFX
          </button>
        </div>
      </AnimatedCard>

      {/* Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={300}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)] flex items-center gap-2">
              <span className="text-[12px] font-semibold text-slate-300">Extrato Bancário</span>
              <span className="text-[10px] text-slate-600">Bradesco ••4291 · Mai/2025</span>
              <input type="checkbox" className="ml-auto accent-amber-400 h-3.5 w-3.5 cursor-pointer"
                onChange={e => {
                  const v: Record<number,boolean> = {};
                  CONCILIACAO_BANCO.forEach((_, i) => v[i] = e.target.checked);
                  setCheckedBanco(v);
                }} />
            </div>
            {CONCILIACAO_BANCO.map((c, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 transition-colors ${checkedBanco[i] ? "bg-amber-400/[0.04]" : "hover:bg-[var(--sgt-row-hover)]"}`}>
                <input type="checkbox" className="mt-0.5 accent-amber-400 h-3.5 w-3.5 cursor-pointer shrink-0"
                  checked={!!checkedBanco[i]} onChange={e => setCheckedBanco(p => ({ ...p, [i]: e.target.checked }))} />
                {concStatusIcon(c.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-300">{c.desc}</p>
                  <p className="text-[10px] text-slate-600">{c.meta}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[12px] font-semibold tabular-nums ${c.valor > 0 ? "text-emerald-300" : "text-rose-300"}`}>{c.valor > 0 ? "+" : ""}{fmtBRL(c.valor)}</p>
                  <ConcStatus s={c.status} />
                </div>
              </div>
            ))}
          </SectionCard>
        </AnimatedCard>
        <AnimatedCard delay={350}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)] flex items-center gap-2">
              <span className="text-[12px] font-semibold text-slate-300">Lançamentos ERP</span>
              <span className="text-[10px] text-slate-600">Não conciliados: 28</span>
              <input type="checkbox" className="ml-auto accent-amber-400 h-3.5 w-3.5 cursor-pointer"
                onChange={e => {
                  const v: Record<number,boolean> = {};
                  CONCILIACAO_ERP.forEach((_, i) => v[i] = e.target.checked);
                  setCheckedErp(v);
                }} />
            </div>
            {CONCILIACAO_ERP.map((c, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 transition-colors ${checkedErp[i] ? "bg-amber-400/[0.04]" : "hover:bg-[var(--sgt-row-hover)]"}`}>
                <input type="checkbox" className="mt-0.5 accent-amber-400 h-3.5 w-3.5 cursor-pointer shrink-0"
                  checked={!!checkedErp[i]} onChange={e => setCheckedErp(p => ({ ...p, [i]: e.target.checked }))} />
                {concStatusIcon(c.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-300">{c.desc}</p>
                  <p className="text-[10px] text-slate-600">{c.meta}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[12px] font-semibold tabular-nums ${c.valor > 0 ? "text-emerald-300" : "text-rose-300"}`}>{c.valor > 0 ? "+" : ""}{fmtBRL(c.valor)}</p>
                  <ConcStatus s={c.status} />
                </div>
              </div>
            ))}
          </SectionCard>
        </AnimatedCard>
      </div>
    </div>
  );
}

function ScreenRelatorios() {
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo,   setDateTo]   = useState("2025-05-31");

  const reports = [
    { name: "DRE Simplificado", desc: "Receitas, despesas e resultado por período. Exporta PDF e Excel.", tag: "Mensal", cor: "blue", icon: FileBarChart },
    { name: "Fluxo de Caixa", desc: "Entradas e saídas projetadas vs realizadas com saldo diário.", tag: "Diário", cor: "emerald", icon: BarChart3 },
    { name: "Análise por Categoria", desc: "Distribuição de gastos e receitas por categoria e centro de custo.", tag: "Analítico", cor: "amber", icon: Tag },
    { name: "Aging de Fornecedores", desc: "Títulos vencidos agrupados por faixa: 30, 60, 90, 90+ dias.", tag: "Gerencial", cor: "violet", icon: Building2 },
    { name: "Aging de Clientes", desc: "Inadimplência e concentração de recebíveis por cliente.", tag: "Gerencial", cor: "rose", icon: Users },
    { name: "Conciliação Bancária", desc: "Status detalhado de conciliações por conta e período.", tag: "Auditoria", cor: "teal", icon: RefreshCcw },
  ];

  const recentes = [
    { nome: "DRE Abril/2025",           tipo: "PDF",   gerado: "11/05/2025 14:22", periodo: "Abr/2025",     tamanho: "248 KB" },
    { nome: "Fluxo de Caixa Mai/2025",  tipo: "Excel", gerado: "10/05/2025 09:05", periodo: "Mai/2025",     tamanho: "184 KB" },
    { nome: "Aging Fornecedores Q1",    tipo: "PDF",   gerado: "02/04/2025 11:40", periodo: "Jan–Mar/25",   tamanho: "512 KB" },
    { nome: "DRE Mar/2025",             tipo: "PDF",   gerado: "05/04/2025 08:15", periodo: "Mar/2025",     tamanho: "231 KB" },
    { nome: "Conciliação Mar/2025",     tipo: "Excel", gerado: "01/04/2025 16:00", periodo: "Mar/2025",     tamanho: "98 KB"  },
    { nome: "Aging Clientes Fev/2025",  tipo: "PDF",   gerado: "03/03/2025 10:20", periodo: "Fev/2025",     tamanho: "178 KB" },
    { nome: "Fluxo de Caixa Abr/2025", tipo: "Excel", gerado: "30/04/2025 17:45", periodo: "Abr/2025",     tamanho: "165 KB" },
    { nome: "DRE Fev/2025",             tipo: "PDF",   gerado: "04/03/2025 09:00", periodo: "Fev/2025",     tamanho: "218 KB" },
  ];

  const corMap: Record<string, string> = {
    blue: "bg-blue-400/10 border-blue-400/20 text-blue-300",
    emerald: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    amber: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    violet: "bg-violet-400/10 border-violet-400/20 text-violet-300",
    rose: "bg-rose-400/10 border-rose-400/20 text-rose-300",
    teal: "bg-teal-400/10 border-teal-400/20 text-teal-300",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-4 py-2.5">
        <span className="text-[11px] font-semibold text-slate-500">Período</span>
        <DatePickerInput value={dateFrom} onChange={setDateFrom} placeholder="Data início" />
        <span className="text-[11px] text-slate-600">até</span>
        <DatePickerInput value={dateTo} onChange={setDateTo} placeholder="Data fim" />
        <button className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors">Gerar Relatório</button>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Disponíveis</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r, i) => {
          const Icon = r.icon;
          const c = corMap[r.cor];
          return (
            <AnimatedCard key={r.name} delay={i * 60}>
              <div className="group flex flex-col gap-3 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 cursor-pointer hover:border-[var(--sgt-border-medium)] transition-all">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${c}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-200">{r.name}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">{r.desc}</p>
                </div>
                <span className={`self-start rounded-md px-2 py-0.5 text-[10px] font-semibold border ${c}`}>{r.tag}</span>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Recentes</p>
      <AnimatedCard delay={400}>
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>Relatório</Th><Th>Tipo</Th><Th>Gerado em</Th><Th>Período</Th><Th>Tamanho</Th><Th>Ações</Th></tr></thead>
              <tbody>
                {recentes.map(r => (
                  <tr key={r.nome} className="hover:bg-[var(--sgt-row-hover)] transition-colors">
                    <Td className="font-medium text-slate-200">{r.nome}</Td>
                    <Td><StatusBadge s={r.tipo} /></Td>
                    <Td className="text-slate-500">{r.gerado}</Td>
                    <Td className="text-slate-500">{r.periodo}</Td>
                    <Td className="text-slate-600">{r.tamanho}</Td>
                    <Td><div className="flex gap-1"><ActionBtn icon={Download} title="Download" /><ActionBtn icon={Eye} title="Visualizar" /></div></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}


function buildPartnersFromDW(rows: any[], origem: "CP" | "CR") {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const map = new Map<string, {
    cod: string; nome: string; volume: number; emAberto: number; vencido: number;
    qtdTitulos: number; qtdAbertos: number; qtdVencidos: number;
    prazoTotal: number; prazoCount: number; ultimaMov: number | null;
    rows: PartnerRow[];
  }>();

  rows.filter((r: any) => r.ORIGEM === origem && r.NOME_PARCEIRO).forEach((r: any) => {
    const k = String(r.COD_PARCEIRO ?? r.NOME_PARCEIRO ?? "");
    if (!map.has(k)) map.set(k, {
      cod: String(r.COD_PARCEIRO ?? ""), nome: r.NOME_PARCEIRO ?? "N/A",
      volume: 0, emAberto: 0, vencido: 0,
      qtdTitulos: 0, qtdAbertos: 0, qtdVencidos: 0,
      prazoTotal: 0, prazoCount: 0, ultimaMov: null, rows: [],
    });
    const e = map.get(k)!;
    const valor = Number(r.VLR_PARCELA ?? r.VLRDOC ?? 0);
    const valorPago = Number(r.VLR_PAGO ?? 0);
    const pago = valorPago >= valor && valor > 0;
    const venc = r.DATA_VENCIMENTO ? new Date(r.DATA_VENCIMENTO) : null;
    if (venc) venc.setHours(0, 0, 0, 0);
    const diasAtraso = !pago && venc && venc.getTime() < hoje.getTime()
      ? Math.floor((hoje.getTime() - venc.getTime()) / 86400000) : 0;
    const aberto = Math.max(0, valor - valorPago);

    e.volume += valor;
    e.qtdTitulos++;
    if (!pago) { e.emAberto += aberto; e.qtdAbertos++; }
    if (diasAtraso > 0) { e.vencido += aberto; e.qtdVencidos++; }
    if (r.DATA_EMISSAO && r.DATA_VENCIMENTO) {
      const dias = Math.floor((new Date(r.DATA_VENCIMENTO).getTime() - new Date(r.DATA_EMISSAO).getTime()) / 86400000);
      if (dias > 0 && dias < 365) { e.prazoTotal += dias; e.prazoCount++; }
    }
    const movDate = r.DATA_PAGAMENTO ?? r.DATA_EMISSAO ?? null;
    if (movDate) {
      const t = new Date(movDate).getTime();
      if (e.ultimaMov === null || t > e.ultimaMov) e.ultimaMov = t;
    }
    e.rows.push({
      documento: String(r.NUMDOC ?? r.NUM_TITULO ?? "—"),
      parcela: r.NUMPAR != null ? String(r.NUMPAR) : null,
      emissao: r.DATA_EMISSAO ?? null,
      vencimento: r.DATA_VENCIMENTO ?? null,
      pagamento: r.DATA_PAGAMENTO ?? null,
      valor, valorPago, pago, diasAtraso,
    });
  });

  return Array.from(map.values()).map(e => ({
    cod: e.cod, nome: e.nome,
    volume: e.volume, emAberto: e.emAberto, vencido: e.vencido,
    qtdTitulos: e.qtdTitulos, qtdAbertos: e.qtdAbertos, qtdVencidos: e.qtdVencidos,
    prazoMedio: e.prazoCount > 0 ? Math.round(e.prazoTotal / e.prazoCount) : 0,
    ultimaMov: e.ultimaMov ? new Date(e.ultimaMov).toISOString() : null,
    rows: e.rows,
  })).sort((a, b) => b.volume - a.volume);
}

function ScreenFornecedores() {
  const { dwRawData, isFetchingDw, fetchFromDW } = useFinancialData();
  useEffect(() => {
    if (!isFetchingDw && dwRawData.length === 0) fetchFromDW();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const partners = useMemo(() => buildPartnersFromDW(dwRawData, "CP"), [dwRawData]);
  return <PartnersAnalytics kind="fornecedor" partners={partners} isLoading={isFetchingDw} />;
}

function ScreenClientes() {
  const { dwRawData, isFetchingDw, fetchFromDW } = useFinancialData();
  useEffect(() => {
    if (!isFetchingDw && dwRawData.length === 0) fetchFromDW();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const partners = useMemo(() => buildPartnersFromDW(dwRawData, "CR"), [dwRawData]);
  return <PartnersAnalytics kind="cliente" partners={partners} isLoading={isFetchingDw} />;
}

function ScreenCategorias() {
  const { dwRawData, isFetchingDw, fetchFromDW } = useFinancialData();
  const [filtroTipo, setFiltroTipo] = useState<"todos"|"Despesa"|"Receita">("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isFetchingDw && dwRawData.length === 0) fetchFromDW();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Paleta de cores sequencial para centros de custo ──────────────────────
  const PALETA = [
    { bar: "bg-amber-400",   ico: "bg-amber-400/10 border-amber-400/20 text-amber-300",   hex: "#fbbf24" },
    { bar: "bg-blue-400",    ico: "bg-blue-400/10 border-blue-400/20 text-blue-300",     hex: "#60a5fa" },
    { bar: "bg-violet-400",  ico: "bg-violet-400/10 border-violet-400/20 text-violet-300", hex: "#a78bfa" },
    { bar: "bg-teal-400",    ico: "bg-teal-400/10 border-teal-400/20 text-teal-300",     hex: "#2dd4bf" },
    { bar: "bg-rose-400",    ico: "bg-rose-400/10 border-rose-400/20 text-rose-300",     hex: "#fb7185" },
    { bar: "bg-emerald-400", ico: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300", hex: "#34d399" },
    { bar: "bg-cyan-400",    ico: "bg-cyan-400/10 border-cyan-400/20 text-cyan-300",     hex: "#22d3ee" },
    { bar: "bg-orange-400",  ico: "bg-orange-400/10 border-orange-400/20 text-orange-300", hex: "#fb923c" },
    { bar: "bg-pink-400",    ico: "bg-pink-400/10 border-pink-400/20 text-pink-300",     hex: "#f472b6" },
    { bar: "bg-indigo-400",  ico: "bg-indigo-400/10 border-indigo-400/20 text-indigo-300", hex: "#818cf8" },
  ];

  // ── Agrega dwRawData por CENTRO_CUSTO ─────────────────────────────────────
  const categorias = useMemo(() => {
    const mapDesp = new Map<string, { cod: string; nome: string; valor: number; qtd: number }>();
    const mapRec  = new Map<string, { cod: string; nome: string; valor: number; qtd: number }>();

    dwRawData.forEach(r => {
      const nome = r.CENTRO_CUSTO ?? r.ANALITICA ?? r.SINTETICA ?? "Sem categoria";
      const cod  = String(r.CODCUS ?? r.CODCGA ?? "");
      const val  = r.VLR_PARCELA ?? r.VLR_LIQUIDO ?? r.VLRDOC ?? 0;
      if (!val || val <= 0) return;

      if (r.ORIGEM === "CP") {
        const k = cod || nome;
        if (!mapDesp.has(k)) mapDesp.set(k, { cod, nome, valor: 0, qtd: 0 });
        const e = mapDesp.get(k)!;
        e.valor += val;
        e.qtd++;
      } else if (r.ORIGEM === "CR") {
        const k = cod || nome;
        if (!mapRec.has(k)) mapRec.set(k, { cod, nome, valor: 0, qtd: 0 });
        const e = mapRec.get(k)!;
        e.valor += val;
        e.qtd++;
      }
    });

    const desp = Array.from(mapDesp.values()).sort((a,b) => b.valor - a.valor);
    const rec  = Array.from(mapRec.values()).sort((a,b) => b.valor - a.valor);
    const totalDesp = desp.reduce((s,c) => s+c.valor, 0);
    const totalRec  = rec.reduce((s,c)  => s+c.valor, 0);

    return {
      despesas: desp.map((c,i) => ({ ...c, tipo: "Despesa" as const, pct: totalDesp > 0 ? (c.valor/totalDesp)*100 : 0, paleta: PALETA[i % PALETA.length] })),
      receitas:  rec.map((c,i)  => ({ ...c, tipo: "Receita" as const, pct: totalRec > 0  ? (c.valor/totalRec)*100  : 0, paleta: PALETA[i % PALETA.length] })),
      totalDesp,
      totalRec,
    };
  }, [dwRawData]);

  const { despesas, receitas, totalDesp, totalRec } = categorias;
  const total = totalDesp + totalRec;

  const donutData = [
    { name: "Despesas", value: totalDesp, fill: "#fb7185" },
    { name: "Receitas", value: totalRec,  fill: "#34d399" },
  ];

  const allItems = [
    ...despesas.map(c => ({ ...c, tipo: "Despesa" as const })),
    ...receitas.map(c => ({ ...c, tipo: "Receita" as const })),
  ].filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.nome.toLowerCase().includes(q) || c.cod.toLowerCase().includes(q);
    const matchT = filtroTipo === "todos" || c.tipo === filtroTipo;
    return matchQ && matchT;
  });

  const CustomDonutLabel = ({ cx, cy }: any) => {
    const margem = total > 0 ? ((totalRec - totalDesp) / total * 100) : 0;
    return (
      <>
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#e2e8f0" fontSize={18} fontWeight={700}>{margem >= 0 ? "+" : ""}{margem.toFixed(0)}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={10}>margem</text>
      </>
    );
  };

  if (isFetchingDw) return <SkeletonLoader label="Carregando categorias..." />;

  if (total === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
      <Tag className="h-10 w-10 opacity-30" />
      <p className="text-[13px]">Nenhum dado por centro de custo no período. Clique em Atualizar.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Donut + totais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AnimatedCard>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Composição do período</span>
            </div>
            <div className="flex items-center justify-center py-2" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="value" labelLine={false} label={<CustomDonutLabel />}>
                    {donutData.map((d,i) => <Cell key={i} fill={d.fill} fillOpacity={0.85} />)}
                  </Pie>
                  <Tooltip formatter={(v:any) => fmtK(v)} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 pb-3">
              <span className="flex items-center gap-1.5 text-[10px] text-rose-300"><span className="h-2 w-2 rounded-full bg-rose-400" />Despesas {total>0?((totalDesp/total)*100).toFixed(0):0}%</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />Receitas {total>0?((totalRec/total)*100).toFixed(0):0}%</span>
            </div>
          </SectionCard>
        </AnimatedCard>

        <AnimatedCard delay={60}>
          <div className="group relative flex min-h-[110px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 h-full transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)] shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-400/60 to-rose-700/20" />
            <div className="flex items-start justify-between gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 leading-tight">Total Despesas</p>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-rose-400/[0.08] border border-rose-400/[0.15] text-rose-300">
                <TrendingDown className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1.3rem,2.2vw,1.7rem)] overflow-hidden text-ellipsis whitespace-nowrap">{fmtK(totalDesp)}</p>
            <p className="mt-2 text-[10px] font-medium tracking-[0.1em] text-slate-500">{despesas.length} centros de custo</p>
            <div className="mt-2 h-1.5 rounded-full bg-rose-400/10 overflow-hidden">
              <div className="h-1.5 rounded-full bg-rose-400/60" style={{ width: `${total>0?(totalDesp/total*100).toFixed(0):0}%` }} />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={120}>
          <div className="group relative flex min-h-[110px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 h-full transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)] shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400/60 to-emerald-700/20" />
            <div className="flex items-start justify-between gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 leading-tight">Total Receitas</p>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-emerald-400/[0.08] border border-emerald-400/[0.15] text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1.3rem,2.2vw,1.7rem)] overflow-hidden text-ellipsis whitespace-nowrap">{fmtK(totalRec)}</p>
            <p className="mt-2 text-[10px] font-medium tracking-[0.1em] text-slate-500">{receitas.length} centros de custo</p>
            <div className="mt-2 h-1.5 rounded-full bg-emerald-400/10 overflow-hidden">
              <div className="h-1.5 rounded-full bg-emerald-400/60" style={{ width: `${total>0?(totalRec/total*100).toFixed(0):0}%` }} />
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Filtros */}
      <FilterBar search={search} onSearch={setSearch}>
        <div className="h-4 w-px bg-[var(--sgt-divider)]" />
        {(["todos","Despesa","Receita"] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${filtroTipo===t?"bg-amber-500/15 border-amber-500/30 text-amber-300":"border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>
            {t === "todos" ? "Todos" : t === "Despesa" ? "Despesas" : "Receitas"}
          </button>
        ))}
        <span className="text-[11px] text-slate-600 ml-1">{allItems.length} centros</span>
      </FilterBar>

      {/* Lista de centros de custo */}
      <div className="flex flex-col gap-2">
        {allItems.map((c, i) => {
          const isPc = filtroTipo === "todos" ? c.tipo === "Despesa" ? totalDesp : totalRec : (filtroTipo === "Despesa" ? totalDesp : totalRec);
          const pct = isPc > 0 ? (c.valor / isPc) * 100 : 0;
          const icoTotal = filtroTipo === "todos" ? c.paleta.ico : c.paleta.ico;

          return (
            <AnimatedCard key={`${c.tipo}-${c.cod}-${c.nome}`} delay={i * 40}>
              <div className="flex items-center gap-3 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-4 py-3 hover:border-[var(--sgt-border-medium)] transition-all">
                {/* Ícone tipo */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold ${c.tipo === "Despesa" ? "bg-rose-400/10 border-rose-400/20 text-rose-300" : "bg-emerald-400/10 border-emerald-400/20 text-emerald-300"}`}>
                  {c.tipo === "Despesa" ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[12px] font-semibold text-slate-200 truncate">{c.nome}</p>
                    {c.cod && <span className="text-[9px] text-slate-600 shrink-0">#{c.cod}</span>}
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold border ${c.tipo === "Despesa" ? "bg-rose-400/10 border-rose-400/20 text-rose-400" : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"}`}>{c.tipo}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mb-1.5">{c.qtd} lançamentos</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--sgt-progress-track)] overflow-hidden">
                      <div className={`h-1.5 rounded-full ${c.paleta.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: c.paleta.hex }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>

                <p className="text-[14px] font-semibold text-white tabular-nums text-right shrink-0 ml-2">{fmtK(c.valor)}</p>

                {/* Kebab */}
                <div className="relative group/kb shrink-0">
                  <button className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-slate-600 hover:border-[var(--sgt-border-subtle)] hover:text-slate-300 transition-colors">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute right-0 top-7 z-10 hidden group-hover/kb:flex flex-col w-36 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] shadow-xl overflow-hidden">
                    <button className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-400 hover:bg-[var(--sgt-row-hover)] hover:text-slate-200 transition-colors"><Eye className="h-3 w-3" />Ver lançamentos</button>
                    <button className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-400 hover:bg-[var(--sgt-row-hover)] hover:text-slate-200 transition-colors"><Pencil className="h-3 w-3" />Editar</button>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── TELA PREVISTO ────────────────────────────────────────────────────────────
function ScreenPrevisto() {
  const { contasPagar, contasReceber, dwRawData, isFetchingDw } = useFinancialData();
  const [horizonte, setHorizonte] = useState<30 | 60 | 90>(30);
  // Saldo de partida = movimentação líquida bancária acumulada do período
  const saldoAtual = useMemo(() =>
    dwRawData.filter(r => r.ORIGEM === "LB_C" || r.ORIGEM === "LB_D")
      .reduce((s, r) => {
        const val = Math.abs(r.VLRDOC ?? r.VLR_PARCELA ?? 0);
        return r.ORIGEM === "LB_C" ? s + val : s - val;
      }, 0),
  [dwRawData]);

  const eventosPrevistos = useMemo(() => [
    ...contasPagar.filter(c => dsPagar(c) === "Pendente" || dsPagar(c) === "Vence Hoje")
        .map(c => ({ data: c.vencimento, valor: -c.valor, tipo: "Saída" as const, desc: c.fornecedor, doc: c.documento ?? "" })),
    ...contasReceber.filter(c => dsReceber(c) === "Pendente" || dsReceber(c) === "Vence Hoje")
        .map(c => ({ data: c.vencimento, valor: c.valor,  tipo: "Entrada" as const, desc: c.cliente,    doc: c.documento ?? "" })),
  ].sort((a, b) => a.data.localeCompare(b.data)), [contasPagar, contasReceber]);

  const projecao = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limit = new Date(hoje); limit.setDate(limit.getDate() + horizonte);
    const dias: { dia: string; entradas: number; saidas: number; saldo: number }[] = [];
    let saldo = saldoAtual;
    const cur = new Date(hoje);
    while (cur <= limit) {
      const key  = cur.toISOString().slice(0,10);
      const label = cur.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entradas = eventosPrevistos.filter(e => e.data === key && e.tipo === "Entrada").reduce((s,e) => s+e.valor, 0);
      const saidas   = eventosPrevistos.filter(e => e.data === key && e.tipo === "Saída"  ).reduce((s,e) => s+Math.abs(e.valor), 0);
      saldo += entradas - saidas;
      if (entradas > 0 || saidas > 0 || dias.length % 5 === 0) dias.push({ dia: label, entradas, saidas, saldo });
      cur.setDate(cur.getDate() + 1);
    }
    return dias;
  }, [horizonte, eventosPrevistos, saldoAtual]);

  const totalEntradas = eventosPrevistos.filter(e => e.tipo === "Entrada").reduce((s,e) => s+e.valor, 0);
  const totalSaidas   = eventosPrevistos.filter(e => e.tipo === "Saída"  ).reduce((s,e) => s+Math.abs(e.valor), 0);
  const saldoFinal    = saldoAtual + totalEntradas - totalSaidas;
  const diasCriticos  = projecao.filter(d => d.saldo < 100000).length;
  const LIMITE        = 100000;

  const kpis = [
    { label: "Saldo Atual",       value: fmtK(saldoAtual),    sub: "Posição bancária atual",   icon: Landmark,     stripe: "from-cyan-400/60 to-cyan-700/20",    iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]"   },
    { label: "Entradas Previstas", value: fmtK(totalEntradas), sub: `${eventosPrevistos.filter(e => e.tipo === "Entrada").length} títulos a receber`, icon: TrendingUp, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
    { label: "Saídas Previstas",   value: fmtK(totalSaidas),   sub: `${eventosPrevistos.filter(e => e.tipo === "Saída").length} títulos a pagar`,    icon: TrendingDown, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
    { label: "Saldo Projetado",    value: fmtK(saldoFinal),    sub: saldoFinal >= saldoAtual ? "↑ Posição favorável" : "↓ Posição desfavorável", icon: BarChart3, stripe: saldoFinal >= saldoAtual ? "from-amber-400/60 to-amber-700/20" : "from-rose-400/60 to-rose-700/20", iconBg: saldoFinal >= saldoAtual ? "bg-amber-400/[0.08] border border-amber-400/[0.15]" : "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: saldoFinal >= saldoAtual ? "text-amber-300" : "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
  ];

  if (isFetchingDw) return <SkeletonLoader label="Calculando projeção de caixa..." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {diasCriticos > 0 && (
        <AnimatedCard delay={220}>
          <div className="flex items-center gap-3 rounded-[12px] border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-[12px] font-semibold text-amber-300">
              {diasCriticos} dia{diasCriticos > 1 ? "s" : ""} com saldo projetado abaixo de R$ 100k no horizonte selecionado
            </p>
          </div>
        </AnimatedCard>
      )}

      <AnimatedCard delay={260}>
        <SectionCard>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
            <div>
              <span className="text-[12px] font-semibold text-slate-300">Evolução do Saldo Projetado</span>
              <span className="ml-2 text-[10px] text-slate-600">Baseado em títulos pendentes</span>
            </div>
            <div className="flex gap-1">
              {([30, 60, 90] as const).map(h => (
                <button key={h} onClick={() => setHorizonte(h)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${horizonte === h ? "bg-amber-500/20 border border-amber-500/30 text-amber-300" : "border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>{h}d</button>
              ))}
            </div>
          </div>
          <div className="px-2 py-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projecao} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSaldoPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} width={36} />
                <Tooltip formatter={(v: any, n: string) => [fmtK(v), n === "saldo" ? "Saldo" : n === "entradas" ? "Entradas" : "Saídas"]} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine y={LIMITE} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                <Area type="monotone" dataKey="saldo" stroke="#22d3ee" strokeWidth={2} fill="url(#gradSaldoPrev)" dot={false} name="saldo" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 px-4 pb-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-cyan-400/70" />Saldo projetado</span>
            <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t-2 border-dashed border-rose-500/50" />Limite de atenção (R$ 100k)</span>
          </div>
        </SectionCard>
      </AnimatedCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={300}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Entradas × Saídas Previstas</span>
              <span className="ml-2 text-[10px] text-slate-600">Por data de vencimento</span>
            </div>
            <div className="px-2 py-3" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projecao.filter(d => d.entradas > 0 || d.saidas > 0)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} width={30} />
                  <Tooltip formatter={(v: any, n: string) => [fmtK(v), n === "entradas" ? "Entradas" : "Saídas"]} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="entradas" name="entradas" fill="#34d399" fillOpacity={0.75} radius={[3,3,0,0]} />
                  <Bar dataKey="saidas"   name="saidas"   fill="#fb7185" fillOpacity={0.75} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 px-4 pb-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" />Entradas</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" />Saídas</span>
            </div>
          </SectionCard>
        </AnimatedCard>

        <AnimatedCard delay={340}>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Próximos Eventos</span>
              <span className="ml-2 text-[10px] text-slate-600">Pendentes e a vencer</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {eventosPrevistos.slice(0, 12).map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${e.tipo === "Entrada" ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-300 truncate">{e.desc}</p>
                    <p className="text-[10px] text-slate-600">{fmtDate(e.data)} · {e.doc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[12px] font-semibold tabular-nums ${e.tipo === "Entrada" ? "text-emerald-300" : "text-rose-300"}`}>
                      {e.tipo === "Entrada" ? "+" : "-"}{fmtK(Math.abs(e.valor))}
                    </p>
                    <span className={`text-[9px] font-semibold ${e.tipo === "Entrada" ? "text-emerald-600" : "text-rose-600"}`}>{e.tipo}</span>
                  </div>
                </div>
              ))}
              {eventosPrevistos.length === 0 && (
                <p className="px-4 py-8 text-center text-[12px] text-slate-600">Nenhum evento previsto no período</p>
              )}
            </div>
          </SectionCard>
        </AnimatedCard>
      </div>
    </div>
  );
}

function ScreenBancos() {
  const { dwRawData, dwFilter, filiais, isFetchingDw } = useFinancialData();
  const [contas, setContas] = useState<import("@/lib/dwApi").BankAccount[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [extratoKey, setExtratoKey] = useState<string | null>(null);
  const [erroBancos, setErroBancos] = useState<string | null>(null);

  // Busca contas bancárias com saldo real
  useEffect(() => {
    setLoadingContas(true);
    setErroBancos(null);
    import("@/lib/dwApi").then(({ fetchBankAccounts }) =>
      fetchBankAccounts({
        filial:  dwFilter.filial  ?? undefined,
        empresa: dwFilter.empresa ?? undefined,
      })
    ).then(res => {
      setContas(res.data ?? []);
      setExtratoKey(res.data?.[0]?.cod_conta ?? null);
    }).catch(err => {
      setErroBancos(err.message);
    }).finally(() => setLoadingContas(false));
  }, [dwFilter.filial, dwFilter.empresa]);

  // Lançamentos bancários do período (do /dw-financeiro já carregado)
  const lbRows = useMemo(() =>
    dwRawData.filter(r => r.ORIGEM === "LB_D" || r.ORIGEM === "LB_C"),
    [dwRawData]
  );

  // Extrato: filtra por COD_CONTA quando disponível, senão por FILIAL
  const contaAtiva = contas.find(c => c.cod_conta === extratoKey);
  const extratoRows = useMemo(() => {
    if (!contaAtiva) return [];
    return lbRows.filter(r =>
      r.COD_CONTA
        ? r.COD_CONTA === contaAtiva.cod_conta
        : r.FILIAL    === contaAtiva.filial
    ).sort((a,b) =>
      (b.DATA_LANCAMENTO ?? b.DATA_EMISSAO ?? "")
       .localeCompare(a.DATA_LANCAMENTO ?? a.DATA_EMISSAO ?? "")
    );
  }, [contaAtiva, lbRows]);

  // Paleta por índice
  const PALETA = [
    { border: "border-amber-400/20",   val: "text-amber-200",    bg: "bg-amber-400/[0.04]" },
    { border: "border-rose-400/20",    val: "text-rose-200",     bg: "bg-rose-400/[0.04]"  },
    { border: "border-violet-400/20",  val: "text-violet-200",   bg: "bg-violet-400/[0.04]"},
    { border: "border-teal-400/20",    val: "text-teal-200",     bg: "bg-teal-400/[0.04]"  },
    { border: "border-blue-400/20",    val: "text-blue-200",     bg: "bg-blue-400/[0.04]"  },
    { border: "border-emerald-400/20", val: "text-emerald-200",  bg: "bg-emerald-400/[0.04]"},
    { border: "border-cyan-400/20",    val: "text-cyan-200",     bg: "bg-cyan-400/[0.04]"  },
    { border: "border-orange-400/20",  val: "text-orange-200",   bg: "bg-orange-400/[0.04]"},
  ];
  const tipoLabel: Record<string, string> = {
    Principal: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    Movimento: "bg-blue-400/10 border-blue-400/20 text-blue-300",
    Investimento: "bg-violet-400/10 border-violet-400/20 text-violet-300",
  };

  const saldoTotal = contas.reduce((s, c) => s + c.saldo_atual, 0);

  // Evolução diária do movimento do período
  const evolucao = useMemo(() => {
    const map = new Map<string, number>();
    lbRows.forEach(r => {
      const dia = (r.DATA_LANCAMENTO ?? r.DATA_EMISSAO ?? "").slice(0, 10);
      if (!dia) return;
      const val = Math.abs(r.VLRDOC ?? r.VLR_PARCELA ?? 0);
      map.set(dia, (map.get(dia) ?? 0) + (r.ORIGEM === "LB_C" ? val : -val));
    });
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]))
      .map(([iso, liq]) => ({ dia: new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}), liq }));
  }, [lbRows]);

  if (loadingContas || isFetchingDw) return <SkeletonLoader label="Carregando saldos bancários..." />;

  if (erroBancos) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
      <Landmark className="h-10 w-10 opacity-30" />
      <p className="text-[13px] text-rose-400">Erro ao carregar contas: {erroBancos}</p>
      <p className="text-[11px]">Verifique se o endpoint /dw-bancos está ativo no servidor.</p>
    </div>
  );

  if (contas.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
      <Landmark className="h-10 w-10 opacity-30" />
      <p className="text-[13px]">Nenhuma conta bancária encontrada. Verifique o endpoint /dw-bancos.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── Saldo Consolidado ── */}
      <AnimatedCard>
        <SectionCard>
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--sgt-divider)]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/70">Saldo Consolidado</p>
              <p className="text-[28px] font-black text-cyan-300 leading-none mt-1 tabular-nums">{fmtBRL(saldoTotal)}</p>
              <p className="text-[11px] text-slate-600 mt-1">{contas.length} conta{contas.length !== 1 ? "s" : ""} ativas · atualizado agora</p>
            </div>
            <div style={{ width: 200, height: 64 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBancoSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Tooltip formatter={(v:any) => fmtK(v)} contentStyle={{ background:"var(--sgt-bg-card)", border:"0.5px solid var(--sgt-border-subtle)", borderRadius:8, fontSize:11 }} />
                  <Area type="monotone" dataKey="liq" stroke="#22d3ee" strokeWidth={1.5} fill="url(#gradBancoSaldo)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Mini-totais por conta */}
          <div className="grid divide-x divide-[var(--sgt-divider)]"
            style={{ gridTemplateColumns: `repeat(${Math.min(contas.length, 4)}, 1fr)` }}>
            {contas.slice(0, 4).map((c, i) => {
              const p = PALETA[i % PALETA.length];
              return (
                <div key={c.cod_conta} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BankLogo
                      nome={c.nome_banco}
                      codigo={c.cod_banco}
                      sigla={(c.nome_banco ?? c.nome_conta).slice(0,2).toUpperCase()}
                      size={20}
                      rounded="rounded-md"
                    />
                    <span className="text-[10px] text-slate-600 truncate">{c.nome_banco || c.nome_conta}</span>
                  </div>
                  <p className={`text-[14px] font-black leading-none tabular-nums ${p.val}`}>{fmtK(c.saldo_atual)}</p>
                  <p className="text-[9px] text-slate-600 mt-1">{c.tipo_conta}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </AnimatedCard>

      {/* ── Cards por conta ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contas.map((c, i) => {
          const p = PALETA[i % PALETA.length];
          const tipoClass = tipoLabel[c.tipo_conta] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400";
          const sigla = c.nome_banco ? c.nome_banco.slice(0,2).toUpperCase() : c.nome_conta.slice(0,2).toUpperCase();
          return (
            <AnimatedCard key={c.cod_conta} delay={i * 80}>
              <div className={`rounded-[14px] border bg-[var(--sgt-bg-card)] p-4 ${p.border}`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <BankLogo
                    nome={c.nome_banco}
                    codigo={c.cod_banco}
                    sigla={sigla}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-200 truncate">
                      {c.nome_banco || c.nome_conta}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {c.agencia ? `Ag. ${c.agencia} · ` : ""}CC {c.num_conta}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tipoClass}`}>{c.tipo_conta}</span>
                </div>
                {/* Saldo */}
                <div className="mb-3">
                  <p className="text-[10px] text-slate-600">Saldo disponível</p>
                  <p className={`text-[22px] font-black leading-none tabular-nums ${p.val}`}>{fmtBRL(c.saldo_atual)}</p>
                </div>
                {/* Detalhes */}
                <div className="flex flex-col gap-1 border-t border-[var(--sgt-divider)] pt-3">
                  {[
                    { label: "Entradas no mês",  value: `+${fmtK(c.entradas_mes)}`, clr: "text-emerald-300" },
                    { label: "Saídas no mês",    value: c.saidas_mes > 0 ? `-${fmtK(c.saidas_mes)}` : "—", clr: c.saidas_mes > 0 ? "text-rose-300" : "text-slate-500" },
                    { label: "Lançamentos",      value: String(lbRows.filter(r => r.COD_CONTA ? r.COD_CONTA === c.cod_conta : r.FILIAL === c.filial).length), clr: "text-slate-300" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">{row.label}</span>
                      <span className={`font-semibold ${row.clr}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      {/* ── Extrato com tabs por conta ── */}
      <AnimatedCard delay={380}>
        <SectionCard>
          <div className="flex items-center border-b border-[var(--sgt-divider)] px-4 pt-1 overflow-x-auto">
            {contas.map((c, i) => {
              const p = PALETA[i % PALETA.length];
              const sigla = c.nome_banco ? c.nome_banco.slice(0,2).toUpperCase() : c.nome_conta.slice(0,2).toUpperCase();
              return (
                <button key={c.cod_conta} onClick={() => setExtratoKey(c.cod_conta)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                    extratoKey === c.cod_conta ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}>
                  <BankLogo
                    nome={c.nome_banco}
                    codigo={c.cod_banco}
                    sigla={sigla}
                    size={16}
                    rounded="rounded"
                  />
                  {c.nome_banco || c.nome_conta}
                </button>
              );
            })}
            <div className="ml-auto pb-2 flex gap-3 shrink-0">
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                <Plus className="h-3 w-3" />Lançamento manual
              </button>
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                <Download className="h-3 w-3" />Importar OFX
              </button>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-500">
              Últimos lançamentos ·{" "}
              {contaAtiva?.nome_banco ? `${contaAtiva.nome_banco} · ` : ""}
              {contaAtiva?.nome_conta ?? "—"}
            </span>
          </div>

          {extratoRows.slice(0, 20).map((r, i) => {
            const isC  = r.ORIGEM === "LB_C";
            const val  = Math.abs(r.VLRDOC ?? r.VLR_PARCELA ?? 0);
            const desc = r.HISTORICO
              ?? (r.TIPO_DOCUMENTO && r.DOCUMENTO ? `${r.TIPO_DOCUMENTO} · ${r.DOCUMENTO}` : null)
              ?? r.DOCUMENTO ?? "—";
            const dataExib = r.DATA_LANCAMENTO ?? r.DATA_EMISSAO ?? r.DATA_COMPENSACAO;
            const meta = [
              dataExib ? fmtDate(dataExib.slice(0,10)) : null,
              r.NUM_CHEQUE ? `Cheque ${r.NUM_CHEQUE}` : null,
              r.NUM_AVISO  ? `Aviso ${r.NUM_AVISO}`   : null,
            ].filter(Boolean).join(" · ") || "—";
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                <div className={`h-2 w-2 rounded-full shrink-0 ${isC ? "bg-emerald-400" : "bg-rose-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-300 truncate">{desc}</p>
                  <p className="text-[10px] text-slate-600">{meta}</p>
                </div>
                <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${isC ? "text-emerald-300" : "text-rose-300"}`}>
                  {isC ? "+" : "-"}{fmtBRL(val)}
                </p>
              </div>
            );
          })}
          {extratoRows.length === 0 && (
            <p className="px-4 py-8 text-center text-[12px] text-slate-600">
              Nenhum lançamento no período para esta conta
            </p>
          )}
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR CONFIG
// ─────────────────────────────────────────────────────────────────────────────
type ScreenId = "painel" | "pagar" | "receber" | "conciliacao" | "fluxo" | "previsto" | "relatorios" | "fornecedores" | "clientes" | "categorias" | "bancos";

const NAV: { id: ScreenId; label: string; icon: React.ElementType; badge?: number; section?: string; externalTo?: string }[] = [
  { id: "painel",       label: "Painel",          icon: LayoutDashboard, section: "Financeiro" },
  { id: "pagar",        label: "Contas a Pagar",   icon: ArrowDownCircle, badge: 7 },
  { id: "receber",      label: "Contas a Receber", icon: ArrowUpCircle,   badge: 3, badgeColor: "amber" },
  { id: "conciliacao",  label: "Conciliação",      icon: RefreshCcw },
  { id: "fluxo",        label: "Realizado",        icon: Activity,        externalTo: "/dashboard" },
  { id: "previsto",     label: "Previsto",         icon: TrendingUp },
  { id: "relatorios",   label: "Relatórios",       icon: FileBarChart },
  { id: "fornecedores", label: "Fornecedores",     icon: Building2,  section: "Cadastros" },
  { id: "clientes",     label: "Clientes",         icon: Users },
  { id: "categorias",   label: "Categorias",       icon: Tag },
  { id: "bancos",       label: "Bancos",           icon: Landmark },
];

const SCREEN_META: Record<ScreenId, { title: string; sub: string }> = {
  painel:       { title: "Painel Financeiro",  sub: "Resumo consolidado do módulo financeiro" },
  pagar:        { title: "Contas a Pagar",     sub: "Gestão de títulos e obrigações financeiras" },
  receber:      { title: "Contas a Receber",   sub: "Gestão de recebimentos e clientes" },
  conciliacao:  { title: "Conciliação Bancária",     sub: "Cruzamento entre extrato bancário e ERP" },
  fluxo:        { title: "Realizado",                sub: "Abrindo fluxo de caixa realizado..." },
  previsto:     { title: "Previsto",                 sub: "Projeção de entradas e saídas futuras" },
  relatorios:   { title: "Relatórios",               sub: "Demonstrativos financeiros e gerenciais" },
  fornecedores: { title: "Fornecedores",       sub: "Cadastro e gestão de fornecedores" },
  clientes:     { title: "Clientes",           sub: "Carteira de clientes e histórico de recebimentos" },
  categorias:   { title: "Categorias",         sub: "Plano de contas e centros de custo" },
  bancos:       { title: "Bancos e Contas",    sub: "Saldos, extrato e conciliação por conta" },
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Finance() {
  const [active, setActive] = useState<ScreenId>("painel");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // ── Dados reais do servidor ──────────────────────────────────────────────
  const {
    dwFilter, setDwFilter,
    filiais, empresas,
    isFetchingDw, fetchFromDW,
    loadingPhase, progress,
  } = useFinancialData();

  const meta = SCREEN_META[active];

  function getScreen(id: ScreenId): React.ReactNode {
    switch (id) {
      case "painel":       return <ScreenPainel onNavigate={setActive} />;
      case "pagar":        return <ScreenPagar />;
      case "receber":      return <ScreenReceber />;
      case "conciliacao":  return <ScreenConciliacao />;
      case "fluxo":        return null;
      case "previsto":     return <ScreenPrevisto />;
      case "relatorios":   return <ScreenRelatorios />;
      case "fornecedores": return <ScreenFornecedores />;
      case "clientes":     return <ScreenClientes />;
      case "categorias":   return <ScreenCategorias />;
      case "bancos":       return <ScreenBancos />;
    }
  }

  return (
    <div
      className="flex flex-col min-h-[100dvh] px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{
            background: "var(--sgt-bg-section)",
            borderColor: "var(--sgt-border-subtle)",
            boxShadow: "var(--sgt-section-shadow)",
          }}
        >
          {/* ── HEADER DESKTOP ── */}
          <div
            className="hidden sm:flex flex-shrink-0 items-center gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            {/* Logo + título */}
            <div className="flex items-center gap-3 shrink-0">
              <img src={sgtLogo} alt="SGT" className="h-7 w-auto" />
              <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                <span className="text-[15px] font-black tracking-[-0.03em] text-white">{meta.title}</span>
              </div>
            </div>

            {/* Toggle sidebar — padrão Linear/Vercel */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-transparent text-slate-500 transition-all hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-row-hover)] hover:text-slate-200"
            >
              {sidebarCollapsed
                ? <PanelLeftOpen className="h-3.5 w-3.5" />
                : <PanelLeftClose className="h-3.5 w-3.5" />
              }
            </button>

            {/* Badge tempo real */}
            <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Tempo Real</span>
            </div>

            <div className="h-5 w-px shrink-0 bg-[var(--sgt-divider)]" />

            {/* Filtros */}
            <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
              <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
              <DatePickerInput value={dwFilter.dataFim}   onChange={v => setDwFilter("dataFim", v)}   placeholder="Data fim" />
              <div className="h-4 w-px shrink-0 bg-[var(--sgt-divider)]" />
              <Select value={dwFilter.empresa ?? "__all__"} onValueChange={v => setDwFilter("empresa", v === "__all__" ? null : v)}>
                <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={dwFilter.filial ?? "__all__"} onValueChange={v => setDwFilter("filial", v === "__all__" ? null : v)}>
                <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <UpdateButton onClick={fetchFromDW} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} />
            </div>

            <HomeButton />
          </div>

          {/* ── HEADER MOBILE ── */}
          <div
            className="flex sm:hidden flex-shrink-0 flex-col gap-2 px-4 py-2.5 border-b"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="h-7 w-auto shrink-0" />
                <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] text-white truncate">{meta.title}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <HomeButton />
                <MobileNav />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Início" />
              <DatePickerInput value={dwFilter.dataFim}   onChange={v => setDwFilter("dataFim", v)}   placeholder="Fim" />
              <UpdateButton onClick={fetchFromDW} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} compact />
            </div>
          </div>

          {/* ── BODY: SIDEBAR + CONTENT ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* SIDEBAR */}
            <aside
              className={`flex-shrink-0 flex flex-col border-r transition-all duration-300 ${sidebarCollapsed ? "w-[52px] overflow-visible" : "w-[200px]"}`}
              style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-section)" }}
            >
              <div className={`flex flex-col flex-1 py-2 ${sidebarCollapsed ? "overflow-visible" : "overflow-y-auto"}`}>
                {NAV.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  const showSection = item.section && (i === 0 || NAV[i - 1].section !== item.section);

                  const baseTone = item.externalTo
                    ? "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300"
                    : isActive
                      ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/25"
                      : "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300";

                  if (sidebarCollapsed) {
                    // Modo p\u00edlula: todas as p\u00edlulas usam o mesmo tom \u00e2mbar
                    const collapsedTone = isActive
                      ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/25 hover:bg-amber-500/[0.18]"
                      : "text-slate-500 border border-transparent hover:bg-amber-500/[0.12] hover:text-amber-300 hover:border-amber-500/25";
                    return (
                      <div key={item.id} className="relative px-1.5 py-0.5">
                        <button
                          onClick={() => {
                            if (item.externalTo) { navigate(item.externalTo); return; }
                            setActive(item.id);
                          }}
                          title={item.label}
                          className={`group relative flex items-center gap-2.5 h-9 w-9 hover:w-[176px] overflow-hidden rounded-full pl-2.5 pr-3 text-[12px] font-medium transition-all duration-300 ease-out hover:z-30 hover:shadow-[0_6px_24px_rgba(0,0,0,0.45)] ${collapsedTone}`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 group-hover:text-amber-400 ${isActive ? "text-amber-400" : "text-slate-500"}`} />
                          <span className="whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 delay-75">
                            {item.label}
                          </span>
                          {item.badge && !item.externalTo && (
                            <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 ${
                              (item as any).badgeColor === "amber"
                                ? "bg-amber-400/15 text-amber-300"
                                : "bg-rose-400/15 text-rose-300"
                            }`}>{item.badge}</span>
                          )}
                          {item.externalTo && (
                            <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-amber-300/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100" />
                          )}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id}>
                      {showSection && (
                        <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600">{item.section}</p>
                      )}
                      <button
                        onClick={() => {
                          if (item.externalTo) { navigate(item.externalTo); return; }
                          setActive(item.id);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 rounded-lg mx-1 ${baseTone}`}
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.externalTo && <ExternalLink className="h-3 w-3 shrink-0 text-slate-600" />}
                        {item.badge && !item.externalTo && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            (item as any).badgeColor === "amber"
                              ? "bg-amber-400/15 text-amber-300"
                              : "bg-rose-400/15 text-rose-300"
                          }`}>{item.badge}</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-4">
              {getScreen(active)}
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}
