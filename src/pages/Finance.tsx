import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  LineChart as LineChartIcon, Headphones, UserCog, Briefcase, ShoppingCart, Fuel,
  List, LayoutGrid, Table2,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, ReferenceLine, ComposedChart,
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
      <div className={`group relative flex min-h-[120px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 transition-all duration-300 hover:-translate-y-[3px] ${glow} shadow-[0_2px_20px_rgba(0,0,0,0.35)]`}>
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${stripe}`} />
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
                      <Cell key={f} fill={f==="1–30d"?"#fbbf24":f==="31–60d"?"#f97316":f==="61–90d"?"#ef4444":f==="90d+"?"#991b1b":f==="Pendente"?"#fbbf24":"#f59e0b"} fillOpacity={0.82} />
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
                      <Cell key={f} fill={f==="1–30d"?"#fbbf24":f==="31–60d"?"#f97316":f==="61–90d"?"#ef4444":f==="90d+"?"#991b1b":f==="Pendente"?"#fbbf24":"#f59e0b"} fillOpacity={0.82} />
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

type ConciliacaoStatus = "conciliado" | "pendente" | "divergencia" | "sempar";

type ConciliacaoLancamento = {
  data: string;
  desc: string;
  doc: string;
  extrato: number;
  erp: number;
  diff: number;
  status: ConciliacaoStatus;
};

const CONCILIACAO_LANCAMENTOS: ConciliacaoLancamento[] = [
  { data: "22/05/26", desc: "TRANSF ENTRE FILIAIS",    doc: "TED-8821", extrato: 48200.00, erp: 48200.00, diff: 0,        status: "conciliado" },
  { data: "22/05/26", desc: "PAGTO FORNECEDOR DIESEL",  doc: "DOC-4412", extrato:-22450.00, erp:-22450.00, diff: 0,        status: "conciliado" },
  { data: "21/05/26", desc: "RECEB FRETE CLI 0041",     doc: "NF-10892", extrato: 15800.00, erp: 15800.00, diff: 0,        status: "conciliado" },
  { data: "21/05/26", desc: "DÉBITO AUTOMÁTICO IPVA",   doc: "DEB-0032", extrato: -3200.00, erp:     0.00, diff:-3200.00,  status: "divergencia" },
  { data: "20/05/26", desc: "RECEB FRETE CLI 0077",     doc: "NF-10888", extrato: 34600.00, erp: 34600.00, diff: 0,        status: "conciliado" },
  { data: "20/05/26", desc: "FOLHA PAGAMENTO MAI/26",   doc: "RH-0514",  extrato:-89200.00, erp:-89200.00, diff: 0,        status: "conciliado" },
  { data: "19/05/26", desc: "TARIFA BANCÁRIA MAINT.",   doc: "TB-0190",  extrato:   -84.50, erp:     0.00, diff:  -84.50,  status: "pendente" },
  { data: "19/05/26", desc: "RECEB FRETE CLI 0099",     doc: "NF-10881", extrato: 28900.00, erp: 28750.00, diff:  150.00,  status: "divergencia" },
  { data: "18/05/26", desc: "PAGTO SEGURO FROTA",       doc: "SEG-0221", extrato: -6800.00, erp: -6800.00, diff: 0,        status: "conciliado" },
  { data: "18/05/26", desc: "ESTORNO FRETE CLI 0033",   doc: "EST-0041", extrato:  5100.00, erp:  5100.00, diff: 0,        status: "conciliado" },
  { data: "17/05/26", desc: "SICOOB TED RECEBIDO",      doc: "TED-7741", extrato: 12400.00, erp:     0.00, diff:12400.00,  status: "sempar" },
  { data: "17/05/26", desc: "RECEB FRETE CLI 0019",     doc: "NF-10875", extrato: 19500.00, erp: 19500.00, diff: 0,        status: "conciliado" },
  { data: "16/05/26", desc: "ABASTECIMENTO FILIAL BSB", doc: "AB-0512",  extrato: -4320.00, erp: -4320.00, diff: 0,        status: "conciliado" },
  { data: "16/05/26", desc: "TED SEM IDENTIFICAÇÃO",    doc: "TD-8891",  extrato:  8750.00, erp:     0.00, diff: 8750.00,  status: "sempar" },
  { data: "15/05/26", desc: "PAGTO MANUTENÇÃO FROTA",   doc: "MAN-0381", extrato: -7200.00, erp: -7200.00, diff: 0,        status: "conciliado" },
  { data: "15/05/26", desc: "RECEB FRETE CLI 0055",     doc: "NF-10870", extrato: 41200.00, erp: 41200.00, diff: 0,        status: "conciliado" },
  { data: "14/05/26", desc: "DÉBITO MULTA TRÂNSITO",    doc: "MULT-001", extrato:  -480.00, erp:     0.00, diff: -480.00,  status: "pendente" },
  { data: "14/05/26", desc: "RECEB FRETE CLI 0088",     doc: "NF-10866", extrato: 22800.00, erp: 22800.00, diff: 0,        status: "conciliado" },
  { data: "13/05/26", desc: "PAGTO PEÇAS CLI 0012",     doc: "DOC-4395", extrato: -3100.00, erp: -3100.00, diff: 0,        status: "conciliado" },
  { data: "13/05/26", desc: "IOF OPERAÇÃO CRÉDITO",     doc: "IOF-0214", extrato:   -210.30, erp:     0.00, diff: -210.30, status: "pendente" },
];

const CONCILIACAO_CHART = [
  { dia: "01/05", extrato: 180000, erp: 180000, divergencia: 0 },
  { dia: "02/05", extrato: 195000, erp: 195000, divergencia: 0 },
  { dia: "03/05", extrato: 220000, erp: 218000, divergencia: 2000 },
  { dia: "04/05", extrato: 210000, erp: 209000, divergencia: 1000 },
  { dia: "05/05", extrato: 230000, erp: 229000, divergencia: 1000 },
  { dia: "06/05", extrato: 245000, erp: 244000, divergencia: 1000 },
  { dia: "07/05", extrato: 260000, erp: 258000, divergencia: 2000 },
  { dia: "08/05", extrato: 270000, erp: 268000, divergencia: 2000 },
  { dia: "09/05", extrato: 285000, erp: 284000, divergencia: 1000 },
  { dia: "10/05", extrato: 300000, erp: 298000, divergencia: 2000 },
  { dia: "11/05", extrato: 310000, erp: 308000, divergencia: 2000 },
  { dia: "12/05", extrato: 295000, erp: 293000, divergencia: 2000 },
  { dia: "13/05", extrato: 320000, erp: 318000, divergencia: 2000 },
  { dia: "14/05", extrato: 340000, erp: 335000, divergencia: 5000 },
  { dia: "15/05", extrato: 355000, erp: 353000, divergencia: 2000 },
  { dia: "16/05", extrato: 370000, erp: 366000, divergencia: 4000 },
  { dia: "17/05", extrato: 385000, erp: 370000, divergencia: 15000 },
  { dia: "18/05", extrato: 400000, erp: 398000, divergencia: 2000 },
  { dia: "19/05", extrato: 410000, erp: 408000, divergencia: 2000 },
  { dia: "20/05", extrato: 425000, erp: 423000, divergencia: 2000 },
  { dia: "21/05", extrato: 440000, erp: 438000, divergencia: 2000 },
  { dia: "22/05", extrato: 455000, erp: 452000, divergencia: 3000 },
];

function fmtConcBRL(v: number) {
  const abs = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? "−" : ""}R$ ${abs}`;
}

function fmtConcAxis(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v}`;
}

function ConciliacaoBadge({ status }: { status: ConciliacaoStatus }) {
  const meta: Record<ConciliacaoStatus, { label: string; cls: string; dot: string }> = {
    conciliado: { label: "Conciliado", cls: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
    pendente: { label: "Pendente", cls: "border-blue-400/25 bg-blue-400/10 text-blue-300", dot: "bg-blue-400" },
    divergencia: { label: "Divergência", cls: "border-rose-400/25 bg-rose-400/10 text-rose-300", dot: "bg-rose-400" },
    sempar: { label: "Sem par no ERP", cls: "border-amber-400/25 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
  };
  const current = meta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${current.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}

function ConciliacaoProgress({ value, color = "#22C97A" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function ScreenConciliacao() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroBanco, setFiltroBanco]   = useState("todos");
  const [page, setPage]                 = useState(1);
  const [selectedRows, setSelectedRows] = useState<Record<number,boolean>>({});
  const PAGE_SIZE = 10;

  // ── Dados mock ─────────────────────────────────────────────────────────────
  const lancamentos = useMemo(() => [
    { data:"22/05/26", desc:"TRANSF ENTRE FILIAIS",      doc:"TED-8821", extrato:  48200.00, erp:  48200.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"22/05/26", desc:"PAGTO FORNECEDOR DIESEL",   doc:"DOC-4412", extrato: -22450.00, erp: -22450.00, diff:       0, status:"Conciliado",  banco:"brad"   },
    { data:"21/05/26", desc:"RECEB FRETE CLI 0041",      doc:"NF-10892", extrato:  15800.00, erp:  15800.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"21/05/26", desc:"DÉBITO AUTOMÁTICO IPVA",    doc:"DEB-0032", extrato:  -3200.00, erp:      0.00, diff:   -3200, status:"Divergência", banco:"sicoob" },
    { data:"20/05/26", desc:"RECEB FRETE CLI 0077",      doc:"NF-10888", extrato:  34600.00, erp:  34600.00, diff:       0, status:"Conciliado",  banco:"brad"   },
    { data:"20/05/26", desc:"FOLHA PAGAMENTO MAI/26",    doc:"RH-0514",  extrato: -89200.00, erp: -89200.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"19/05/26", desc:"TARIFA BANCÁRIA MAINT.",    doc:"TB-0190",  extrato:    -84.50, erp:      0.00, diff:    -84.5, status:"Sem par ERP", banco:"brad"  },
    { data:"19/05/26", desc:"RECEB FRETE CLI 0099",      doc:"NF-10881", extrato:  28900.00, erp:  28750.00, diff:     150, status:"Divergência", banco:"bb"     },
    { data:"18/05/26", desc:"PAGTO SEGURO FROTA",        doc:"SEG-0221", extrato:  -6800.00, erp:  -6800.00, diff:       0, status:"Conciliado",  banco:"sicoob" },
    { data:"18/05/26", desc:"ESTORNO FRETE CLI 0033",    doc:"EST-0041", extrato:   5100.00, erp:   5100.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"17/05/26", desc:"SICOOB TED RECEBIDO",       doc:"TED-7741", extrato:  12400.00, erp:      0.00, diff:   12400, status:"Sem par ERP", banco:"sicoob" },
    { data:"17/05/26", desc:"RECEB FRETE CLI 0019",      doc:"NF-10875", extrato:  19500.00, erp:  19500.00, diff:       0, status:"Conciliado",  banco:"brad"   },
    { data:"16/05/26", desc:"ABASTECIMENTO FILIAL BSB",  doc:"AB-0512",  extrato:  -4320.00, erp:  -4320.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"16/05/26", desc:"TED SEM IDENTIFICAÇÃO",     doc:"TD-8891",  extrato:   8750.00, erp:      0.00, diff:    8750, status:"Pendente",    banco:"sicoob" },
    { data:"15/05/26", desc:"PAGTO MANUTENÇÃO FROTA",    doc:"MAN-0381", extrato:  -7200.00, erp:  -7200.00, diff:       0, status:"Conciliado",  banco:"brad"   },
    { data:"15/05/26", desc:"RECEB FRETE CLI 0055",      doc:"NF-10870", extrato:  41200.00, erp:  41200.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"14/05/26", desc:"DÉBITO MULTA TRÂNSITO",     doc:"MULT-001", extrato:    -480.00, erp:      0.00, diff:    -480, status:"Pendente",   banco:"brad"   },
    { data:"14/05/26", desc:"RECEB FRETE CLI 0088",      doc:"NF-10866", extrato:  22800.00, erp:  22800.00, diff:       0, status:"Conciliado",  banco:"bb"     },
    { data:"13/05/26", desc:"PAGTO PEÇAS CLI 0012",      doc:"DOC-4395", extrato:  -3100.00, erp:  -3100.00, diff:       0, status:"Conciliado",  banco:"sicoob" },
    { data:"13/05/26", desc:"IOF OPERAÇÃO CRÉDITO",      doc:"IOF-0214", extrato:    -210.30, erp:      0.00, diff:   -210.3, status:"Sem par ERP", banco:"brad" },
  ], []);

  // ── Gráfico ────────────────────────────────────────────────────────────────
  const chartData = [
    { dia:"01/05", extrato:180, erp:180, diverg:0  }, { dia:"03/05", extrato:220, erp:218, diverg:2  },
    { dia:"05/05", extrato:245, erp:244, diverg:1  }, { dia:"07/05", extrato:270, erp:268, diverg:2  },
    { dia:"09/05", extrato:300, erp:298, diverg:2  }, { dia:"11/05", extrato:310, erp:308, diverg:2  },
    { dia:"13/05", extrato:340, erp:335, diverg:5  }, { dia:"15/05", extrato:370, erp:366, diverg:4  },
    { dia:"17/05", extrato:400, erp:385, diverg:15 }, { dia:"19/05", extrato:420, erp:418, diverg:2  },
    { dia:"21/05", extrato:445, erp:442, diverg:3  }, { dia:"22/05", extrato:458, erp:455, diverg:3  },
  ];

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    let list = lancamentos;
    if (filtroBanco !== "todos") list = list.filter(l => l.banco === filtroBanco);
    if (filtroStatus !== "todos") list = list.filter(l => l.status === filtroStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.desc.toLowerCase().includes(q) || l.doc.toLowerCase().includes(q));
    }
    return list;
  }, [lancamentos, filtroBanco, filtroStatus, search]);

  const totalPags = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginados = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalSel  = Object.values(selectedRows).filter(Boolean).length;

  function toggleRow(idx: number) {
    setSelectedRows(p => ({ ...p, [idx]: !p[idx] }));
  }
  function toggleAll() {
    const allSel = paginados.every((_, i) => selectedRows[(page - 1) * PAGE_SIZE + i]);
    const next = { ...selectedRows };
    paginados.forEach((_, i) => { next[(page - 1) * PAGE_SIZE + i] = !allSel; });
    setSelectedRows(next);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtValConc = (v: number) => {
    const abs = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (v < 0 ? "−" : "") + "R$ " + abs;
  };

  function badgeCfg(s: string) {
    if (s === "Conciliado")  return { bg: "bg-emerald-400/10 border-emerald-400/25", text: "text-emerald-300", dot: "bg-emerald-400" };
    if (s === "Divergência") return { bg: "bg-rose-400/10    border-rose-400/25",    text: "text-rose-300",    dot: "bg-rose-400"    };
    if (s === "Pendente")    return { bg: "bg-blue-400/10    border-blue-400/25",    text: "text-blue-300",    dot: "bg-blue-400"    };
    if (s === "Sem par ERP") return { bg: "bg-amber-400/10   border-amber-400/25",   text: "text-amber-300",   dot: "bg-amber-400"   };
    return { bg: "bg-slate-400/10 border-slate-400/20", text: "text-slate-400", dot: "bg-slate-400" };
  }

  // ── KPIs computados ────────────────────────────────────────────────────────
  const totalExtrato = lancamentos.reduce((s, l) => s + Math.abs(l.extrato), 0);
  const totalErp     = lancamentos.reduce((s, l) => s + Math.abs(l.erp),     0);
  const totalConc    = lancamentos.filter(l => l.status === "Conciliado").reduce((s, l) => s + Math.abs(l.extrato), 0);
  const qtdDiverg    = lancamentos.filter(l => l.status === "Divergência").length;
  const impactoDiverg = lancamentos.filter(l => l.status === "Divergência").reduce((s, l) => s + Math.abs(l.diff), 0);
  const taxaConc     = totalExtrato > 0 ? (totalConc / totalExtrato) * 100 : 0;

  // ── Config bancos ──────────────────────────────────────────────────────────
  const bancos = [
    { id:"bb",     nome:"Banco do Brasil", conta:"001 · C/C 12345-6 · MATRIZ",  extrato:2140000, erp:2120000, pct:94.1, logoCls:"bg-yellow-400/10 border-yellow-400/20 text-yellow-200", letterCls:"text-yellow-300", letra:"BB"  },
    { id:"brad",   nome:"Bradesco",        conta:"237 · C/C 78901-2 · MATRIZ",  extrato:1890000, erp:1880000, pct:91.8, logoCls:"bg-rose-400/10    border-rose-400/20    text-rose-200",   letterCls:"text-rose-300",   letra:"BR"  },
    { id:"sicoob", nome:"Sicoob",          conta:"756 · C/C 34567-8 · FILIAL",  extrato:834000,  erp:811000,  pct:83.2, logoCls:"bg-emerald-400/10 border-emerald-400/20 text-emerald-200",letterCls:"text-emerald-300",letra:"SC"  },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ══ ALERT BANNER ══════════════════════════════════════════════════════ */}
      <AnimatedCard delay={0}>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="flex-1 text-[12px] leading-relaxed" style={{ color: "var(--sgt-text-secondary)" }}>
            <span className="font-bold text-amber-300">Atenção:</span>{" "}
            23 lançamentos do Sicoob estão há mais de 72h sem correspondência no ERP. Revisar antes do fechamento mensal.
          </p>
          <button className="shrink-0 text-[11px] font-bold text-amber-400 underline underline-offset-2 transition-colors hover:text-amber-300">
            Ver pendências →
          </button>
        </div>
      </AnimatedCard>

      {/* ══ KPI CARDS ═════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1 lg:[&>*:last-child]:col-span-1">

        {/* Extrato Banco */}
        <AnimatedCard delay={0}>
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[16px] border border-blue-400/[0.14] bg-[var(--sgt-bg-card)] p-4 shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_32px_rgba(59,130,246,0.18)]">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[16px] bg-gradient-to-r from-blue-400/70 to-blue-700/20" />
            <div className="absolute left-0 top-[22%] bottom-[22%] w-[3px] rounded-r-full bg-blue-400" />
            <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: "var(--sgt-text-muted)" }}>Extrato Banco</p>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.04em] text-blue-300 text-[clamp(1.1rem,1.7vw,1.45rem)] overflow-hidden text-ellipsis whitespace-nowrap">
              {fmtK(totalExtrato)}
            </p>
            <p className="mt-1.5 text-[10px] font-medium tracking-[0.08em]" style={{ color: "var(--sgt-text-muted)" }}>
              {lancamentos.length} lançamentos
            </p>
          </div>
        </AnimatedCard>

        {/* Total ERP */}
        <AnimatedCard delay={50}>
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[16px] border bg-[var(--sgt-bg-card)] p-4 shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-[2px]" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[16px] bg-gradient-to-r from-slate-400/40 to-transparent" />
            <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: "var(--sgt-text-muted)" }}>Total ERP</p>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.04em] text-[clamp(1.1rem,1.7vw,1.45rem)] overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: "var(--sgt-text-primary)" }}>
              {fmtK(totalErp)}
            </p>
            <p className="mt-1.5 text-[10px] font-medium" style={{ color: "var(--sgt-text-muted)" }}>
              <span className="font-bold text-rose-400">−{fmtK(totalExtrato - totalErp)}</span> diferença bruta
            </p>
          </div>
        </AnimatedCard>

        {/* Conciliado */}
        <AnimatedCard delay={100}>
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[16px] border border-emerald-400/[0.14] bg-[var(--sgt-bg-card)] p-4 shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_32px_rgba(16,185,129,0.18)]">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[16px] bg-gradient-to-r from-emerald-400/70 to-emerald-700/20" />
            <div className="absolute left-0 top-[22%] bottom-[22%] w-[3px] rounded-r-full bg-emerald-400" />
            <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: "var(--sgt-text-muted)" }}>Conciliado</p>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.04em] text-emerald-300 text-[clamp(1.1rem,1.7vw,1.45rem)] overflow-hidden text-ellipsis whitespace-nowrap">
              {fmtK(totalConc)}
            </p>
            <div className="mt-2">
              <p className="mb-1 text-[9px] font-medium" style={{ color: "var(--sgt-text-muted)" }}>
                {lancamentos.filter(l => l.status === "Conciliado").length} pares · {taxaConc.toFixed(1)}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                <div className="h-full rounded-full bg-emerald-400 transition-all duration-1000" style={{ width: `${taxaConc.toFixed(1)}%` }} />
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Divergências */}
        <AnimatedCard delay={150}>
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[16px] border border-rose-400/[0.14] bg-[var(--sgt-bg-card)] p-4 shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_32px_rgba(244,63,94,0.18)]">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[16px] bg-gradient-to-r from-rose-400/70 to-rose-700/20" />
            <div className="absolute left-0 top-[22%] bottom-[22%] w-[3px] rounded-r-full bg-rose-400" />
            <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: "var(--sgt-text-muted)" }}>Divergências</p>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.04em] text-rose-300 text-[clamp(1.3rem,2.0vw,1.8rem)]">
              {qtdDiverg}
            </p>
            <p className="mt-1.5 text-[10px] font-medium" style={{ color: "var(--sgt-text-muted)" }}>
              {fmtK(impactoDiverg)} impacto total
            </p>
          </div>
        </AnimatedCard>

        {/* Taxa de Conciliação */}
        <AnimatedCard delay={200}>
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[16px] border border-amber-400/[0.16] bg-[var(--sgt-bg-card)] p-4 shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_32px_rgba(245,158,11,0.20)]">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[16px] bg-gradient-to-r from-amber-400/70 to-amber-700/20" />
            <div className="absolute left-0 top-[22%] bottom-[22%] w-[3px] rounded-r-full bg-amber-400" />
            <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: "var(--sgt-text-muted)" }}>Taxa Conciliação</p>
            <p className="mt-auto pt-2 font-black leading-none tracking-[-0.04em] text-amber-300 text-[clamp(1.3rem,2.0vw,1.8rem)]">
              {taxaConc.toFixed(1)}%
            </p>
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                <div className="h-full rounded-full bg-amber-400 transition-all duration-1000" style={{ width: `${taxaConc.toFixed(1)}%` }} />
              </div>
              <p className="mt-1 text-[9px] font-bold text-rose-400">
                Meta: 95% · −{(95 - taxaConc).toFixed(1)} p.p.
              </p>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* ══ BARRA DE AÇÕES ════════════════════════════════════════════════════ */}
      <AnimatedCard delay={240}>
        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border bg-[var(--sgt-bg-card)] px-4 py-3" style={{ borderColor: "var(--sgt-border-subtle)" }}>
          <button
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
              totalSel > 0
                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "cursor-default border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-600 opacity-50"
            }`}
          >
            <CheckCircle className="h-3 w-3" />
            Confirmar selecionados{totalSel > 0 ? ` (${totalSel})` : ""}
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-400/15">
            <AlertTriangle className="h-3 w-3" />
            Ver divergências ({qtdDiverg})
          </button>
          <div className="h-4 w-px" style={{ background: "var(--sgt-divider)" }} />
          <button className="flex items-center gap-1.5 rounded-lg border bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-slate-300" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <ArrowRightLeft className="h-3 w-3" />Conciliar Auto
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-slate-300" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <Download className="h-3 w-3" />Importar OFX
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-slate-300" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <FileSpreadsheet className="h-3 w-3" />Relatório
          </button>
        </div>
      </AnimatedCard>

      {/* ══ CONTAS POR BANCO ══════════════════════════════════════════════════ */}
      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: "var(--sgt-text-muted)" }}>
          Visão por Conta Bancária
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {bancos.map((b, i) => (
            <AnimatedCard key={b.id} delay={280 + i * 50}>
              <button
                onClick={() => { setFiltroBanco(filtroBanco === b.id ? "todos" : b.id); setPage(1); }}
                className={`group w-full rounded-[14px] border bg-[var(--sgt-bg-card)] p-4 text-left transition-all duration-200 hover:-translate-y-[1px] ${
                  filtroBanco === b.id
                    ? "border-amber-400/35 shadow-[0_0_20px_rgba(245,158,11,0.14)]"
                    : "hover:border-[var(--sgt-border-medium)]"
                }`}
                style={{ borderColor: filtroBanco === b.id ? undefined : "var(--sgt-border-subtle)" }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--sgt-text-primary)" }}>{b.nome}</p>
                    <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>{b.conta}</p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-black ${b.logoCls}`}>
                    {b.letra}
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--sgt-text-muted)" }}>Extrato</p>
                    <p className={`font-black text-[13px] ${b.letterCls}`}>{fmtK(b.extrato)}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--sgt-text-muted)" }}>ERP</p>
                    <p className="font-black text-[13px]" style={{ color: "var(--sgt-text-primary)" }}>{fmtK(b.erp)}</p>
                  </div>
                </div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[9px]" style={{ color: "var(--sgt-text-muted)" }}>Conciliação</p>
                  <p className={`text-[11px] font-black ${b.pct >= 90 ? "text-emerald-300" : "text-amber-300"}`}>{b.pct}%</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${b.pct >= 90 ? "bg-emerald-400" : "bg-amber-400"}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </button>
            </AnimatedCard>
          ))}
        </div>
      </div>

      {/* ══ GRÁFICO + INSIGHT IA ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* Gráfico de evolução diária */}
        <AnimatedCard delay={400}>
          <SectionCard>
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--sgt-divider)" }}>
              <div>
                <p className="text-[12px] font-bold" style={{ color: "var(--sgt-text-primary)" }}>
                  Evolução da Conciliação — Mai/26
                </p>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
                  Extrato vs ERP diário · R$ mil
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>Extrato</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>ERP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>Diverg.</span>
                </div>
              </div>
            </div>
            <div className="h-[216px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="38%">
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    tickFormatter={v => `${v}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1A2540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px" }}
                    labelStyle={{ color: "#F0F4F8", fontSize: 11, fontWeight: 700 }}
                    itemStyle={{ color: "#8FA3BB", fontSize: 11 }}
                    formatter={(v: number, name: string) => [
                      `R$ ${v}k`,
                      name === "extrato" ? "Extrato" : name === "erp" ? "ERP" : "Divergência",
                    ]}
                  />
                  <Bar dataKey="extrato" name="extrato" fill="#4A9EFF" opacity={0.72} radius={[3,3,0,0]} />
                  <Bar dataKey="erp"     name="erp"     fill="#22C97A" opacity={0.76} radius={[3,3,0,0]} />
                  <Bar dataKey="diverg"  name="diverg"  fill="#F0A730" opacity={0.88} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </AnimatedCard>

        {/* Insight IA */}
        <AnimatedCard delay={440}>
          <div className="flex h-full flex-col rounded-[14px] border bg-[var(--sgt-bg-card)] p-4 transition-all hover:border-[var(--sgt-border-medium)]" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            {/* Tipo + Badge novo */}
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-rose-300">
                <AlertTriangle className="h-2.5 w-2.5" />
                Alerta
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                ✦ Novo
              </span>
            </div>

            {/* Label IA */}
            <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--sgt-text-muted)" }}>
              <Zap className="h-2.5 w-2.5 text-amber-400" />
              SGT Insights IA
            </p>

            {/* Título */}
            <p className="mb-2 text-[13px] font-bold leading-snug" style={{ color: "var(--sgt-text-primary)" }}>
              Sicoob acumula 23 lançamentos sem correspondência no ERP há 3+ dias
            </p>

            {/* Corpo */}
            <p className="flex-1 text-[11px] leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
              Lançamentos do Sicoob (C/C 34567-8) entre 14/05 e 17/05 sem par no sistema. Padrão sugere transferências
              entre filiais não registradas pelo operador. Prazo de fechamento em 3 dias.
            </p>

            {/* Confiança */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.08em]" style={{ color: "var(--sgt-text-muted)" }}>
                <span>Confiança</span>
                <span className="text-amber-300">87%</span>
              </div>
              <div className="mb-4 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                <div className="h-full rounded-full bg-amber-400 transition-all duration-1000" style={{ width: "87%" }} />
              </div>

              {/* Impacto */}
              <div className="border-t pt-3" style={{ borderColor: "var(--sgt-divider)" }}>
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: "var(--sgt-text-muted)" }}>
                  Impacto estimado
                </p>
                <p className="font-black tracking-[-0.03em] text-rose-300" style={{ fontSize: "clamp(1rem,1.5vw,1.25rem)" }}>
                  −R$ 23.480,00
                </p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* ══ TABELA DE LANÇAMENTOS ═════════════════════════════════════════════ */}
      <AnimatedCard delay={480}>
        <SectionCard>

          {/* Cabeçalho da tabela */}
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--sgt-divider)" }}>
            <div>
              <p className="text-[12px] font-bold" style={{ color: "var(--sgt-text-primary)" }}>
                Lançamentos para Conciliação
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
                {filtrados.length} registros · {totalSel > 0 ? `${totalSel} selecionados` : "Mai/26"}
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Select banco */}
              <select
                value={filtroBanco}
                onChange={e => { setFiltroBanco(e.target.value); setPage(1); }}
                className="h-8 rounded-lg border bg-[var(--sgt-input-bg)] px-2.5 text-[11px] font-semibold outline-none transition-colors focus:border-[var(--sgt-border-medium)] cursor-pointer"
                style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-secondary)" }}
              >
                <option value="todos">Todos os bancos</option>
                <option value="bb">Banco do Brasil</option>
                <option value="brad">Bradesco</option>
                <option value="sicoob">Sicoob</option>
              </select>

              {/* Status tabs */}
              <div className="flex gap-1 overflow-x-auto">
                {(["todos","Conciliado","Pendente","Divergência","Sem par ERP"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setFiltroStatus(s); setPage(1); }}
                    className={`h-7 whitespace-nowrap rounded-lg border px-2.5 text-[10px] font-semibold transition-all ${
                      filtroStatus === s
                        ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                        : "bg-[var(--sgt-input-bg)] text-slate-500 hover:text-slate-300"
                    }`}
                    style={{ borderColor: filtroStatus === s ? undefined : "var(--sgt-border-subtle)" }}
                  >
                    {s === "todos" ? "Todos" : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="border-b px-4 py-2.5" style={{ borderColor: "var(--sgt-divider)" }}>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--sgt-text-muted)" }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por descrição ou documento..."
                className="h-8 w-full rounded-lg border bg-[var(--sgt-input-bg)] pl-9 pr-3 text-[12px] outline-none transition-colors focus:border-[var(--sgt-border-medium)] placeholder:text-slate-600"
                style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-secondary)" }}
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--sgt-table-head)", borderBottom: "1px solid var(--sgt-divider)" }}>
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-amber-400"
                      onChange={toggleAll}
                      checked={paginados.length > 0 && paginados.every((_, i) => selectedRows[(page - 1) * PAGE_SIZE + i])}
                    />
                  </th>
                  <Th>Data</Th>
                  <Th>Descrição / Doc</Th>
                  <Th className="text-right">Extrato</Th>
                  <Th className="hidden text-right md:table-cell">ERP</Th>
                  <Th className="hidden text-right lg:table-cell">Diferença</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((l, i) => {
                  const absIdx = (page - 1) * PAGE_SIZE + i;
                  const bc = badgeCfg(l.status);
                  const diffCls = l.diff === 0
                    ? "text-slate-600"
                    : Math.abs(l.diff) < 500 ? "text-amber-300 font-bold" : "text-rose-300 font-bold";
                  const isSelected = !!selectedRows[absIdx];

                  return (
                    <tr
                      key={absIdx}
                      className="group border-b transition-colors"
                      style={{
                        borderColor: "var(--sgt-divider)",
                        background: isSelected ? "rgba(245,158,11,0.04)" : undefined,
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--sgt-row-hover)"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ""; }}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="cursor-pointer accent-amber-400"
                          checked={isSelected}
                          onChange={() => toggleRow(absIdx)}
                        />
                      </td>

                      {/* Data */}
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>
                        {l.data}
                      </td>

                      {/* Descrição */}
                      <td className="px-3 py-2.5">
                        <p className="text-[12px] font-semibold" style={{ color: "var(--sgt-text-primary)" }}>{l.desc}</p>
                        <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>{l.doc}</p>
                      </td>

                      {/* Extrato */}
                      <td className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] font-semibold tabular-nums ${l.extrato >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {l.extrato !== 0 ? fmtValConc(l.extrato) : <span className="text-slate-700">—</span>}
                      </td>

                      {/* ERP */}
                      <td className={`hidden whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] tabular-nums md:table-cell ${l.erp >= 0 ? "text-slate-300" : "text-rose-300/70"}`}>
                        {l.erp !== 0 ? fmtValConc(l.erp) : <span className="text-slate-700">—</span>}
                      </td>

                      {/* Diferença */}
                      <td className={`hidden whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] tabular-nums lg:table-cell ${diffCls}`}>
                        {l.diff === 0 ? "—" : fmtValConc(l.diff)}
                      </td>

                      {/* Status badge */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${bc.bg} ${bc.text}`}>
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bc.dot}`} />
                          {l.status}
                        </span>
                      </td>

                      {/* Ações — visíveis no hover via JS no <tr> */}
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <ActionBtn icon={CheckCircle}    title="Conciliar" />
                          <ActionBtn icon={ArrowRightLeft} title="Vincular"  />
                          <ActionBtn icon={Eye}            title="Detalhes"  />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[12px]" style={{ color: "var(--sgt-text-muted)" }}>
                      Nenhum lançamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPags > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--sgt-divider)" }}>
              <p className="text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtrados.length)} de {filtrados.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ borderColor: "var(--sgt-border-subtle)" }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPags) }, (_, i) => {
                  const p =
                    totalPags <= 5        ? i + 1            :
                    page <= 3             ? i + 1            :
                    page >= totalPags - 2 ? totalPags - 4 + i :
                                           page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-semibold transition-all ${
                        page === p
                          ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                          : "text-slate-500 hover:border-amber-400/20 hover:text-amber-300"
                      }`}
                      style={{ borderColor: page === p ? undefined : "var(--sgt-border-subtle)" }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPags, p + 1))}
                  disabled={page === totalPags}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ borderColor: "var(--sgt-border-subtle)" }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

        </SectionCard>
      </AnimatedCard>

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
    { bar: "bg-amber-400",    ico: "bg-amber-400/10 border-amber-400/20 text-amber-300",  hex: "#fbbf24" },
    { bar: "bg-amber-500",    ico: "bg-amber-500/10 border-amber-500/20 text-amber-400",  hex: "#f59e0b" },
    { bar: "bg-amber-300",    ico: "bg-amber-300/10 border-amber-300/20 text-amber-200",  hex: "#fcd34d" },
    { bar: "bg-amber-600",    ico: "bg-amber-600/10 border-amber-600/20 text-amber-500",  hex: "#d97706" },
    { bar: "bg-amber-200",    ico: "bg-amber-200/10 border-amber-200/20 text-amber-100",  hex: "#fde68a" },
    { bar: "bg-amber-700",    ico: "bg-amber-700/10 border-amber-700/20 text-amber-600",  hex: "#b45309" },
    { bar: "bg-amber-400/75", ico: "bg-amber-400/8  border-amber-400/15 text-amber-300",  hex: "#fbbf24" },
    { bar: "bg-amber-500/75", ico: "bg-amber-500/8  border-amber-500/15 text-amber-400",  hex: "#f59e0b" },
    { bar: "bg-amber-300/75", ico: "bg-amber-300/8  border-amber-300/15 text-amber-200",  hex: "#fcd34d" },
    { bar: "bg-amber-600/75", ico: "bg-amber-600/8  border-amber-600/15 text-amber-500",  hex: "#d97706" },
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
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 h-full transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)] shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-400/60 to-rose-700/20" />
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
          <div className="group relative flex min-h-[120px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 h-full transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)] shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400/60 to-emerald-700/20" />
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

type BancoViewMode = "cards" | "tabela" | "analytics";

function ScreenBancos() {
  const { dwRawData, dwFilter, filiais, isFetchingDw } = useFinancialData();
  const [contas, setContas] = useState<import("@/lib/dwApi").BankAccount[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [extratoKey, setExtratoKey] = useState<string | null>(null);
  const [erroBancos, setErroBancos] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<BancoViewMode>("cards");
  const [extratoPage, setExtratoPage] = useState(1);
  const [extratoData, setExtratoData] = useState<import("@/lib/dwApi").BancoExtratoRow[]>([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Busca contas bancárias com saldo real
  const recarregarContas = () => {
    setLoadingContas(true);
    setErroBancos(null);
    import("@/lib/dwApi").then(({ fetchBankAccounts }) =>
      fetchBankAccounts({
        filial:     dwFilter.filial     ?? undefined,
        empresa:    dwFilter.empresa    ?? undefined,
        dataInicio: dwFilter.dataInicio ?? undefined,
        dataFim:    dwFilter.dataFim    ?? undefined,
      })
    ).then(res => {
      const lista = res.data ?? [];
      setContas(lista);
      setExtratoKey(prev => lista.find(c => c.cod_conta === prev) ? prev : (lista[0]?.cod_conta ?? null));
    }).catch(err => {
      setErroBancos(err.message);
    }).finally(() => setLoadingContas(false));
  };
  useEffect(() => { recarregarContas(); }, [dwFilter.filial, dwFilter.empresa, dwFilter.dataInicio, dwFilter.dataFim]);

  const contaAtiva = contas.find(c => c.cod_conta === extratoKey);

  // Extrato: endpoint dedicado /dw-bancos-extrato
  // SITUAC NOT IN ('C') — captura abertos (O) e efetivados (E), não só pendentes
  useEffect(() => {
    if (!contaAtiva) { setExtratoData([]); return; }
    setLoadingExtrato(true);
    setExtratoPage(1);
    import("@/lib/dwApi").then(({ fetchBancoExtrato }) =>
      fetchBancoExtrato({
        codcta:     contaAtiva.cod_conta,
        codfil:     parseInt(String(contaAtiva.filial)) || null,
        dataInicio: dwFilter.dataInicio ?? undefined,
        dataFim:    dwFilter.dataFim    ?? undefined,
      })
    ).then(res => setExtratoData(res.data ?? []))
     .catch(() => setExtratoData([]))
     .finally(() => setLoadingExtrato(false));
  }, [contaAtiva?.cod_conta, contaAtiva?.filial, dwFilter.dataInicio, dwFilter.dataFim]);

  const extratoRows = extratoData;

  const EXTRATO_PAGE_SIZE = 50;
  const extratoPaginas   = Math.max(1, Math.ceil(extratoRows.length / EXTRATO_PAGE_SIZE));
  const extratoPageRows  = extratoRows.slice(
    (extratoPage - 1) * EXTRATO_PAGE_SIZE,
    extratoPage * EXTRATO_PAGE_SIZE
  );

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

  // Evolução diária — usa extratoData da conta ativa
  const evolucao = useMemo(() => {
    const map = new Map<string, number>();
    extratoData.forEach(r => {
      const dia = (r.DATA_LANCAMENTO ?? r.DATA_COMPENSACAO ?? "").slice(0, 10);
      if (!dia) return;
      const val = Math.abs(r.VLRDOC ?? 0);
      map.set(dia, (map.get(dia) ?? 0) + (r.ORIGEM === "LB_C" ? val : -val));
    });
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]))
      .map(([iso, liq]) => ({ dia: new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}), liq }));
  }, [extratoData]);

  if (loadingContas || isFetchingDw) return <SkeletonLoader label="Carregando saldos bancários..." />;

  if (erroBancos) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.08]">
        <Landmark className="h-6 w-6 text-rose-400/60" />
      </div>
      <div className="text-center max-w-[360px]">
        <p className="text-[13px] font-semibold text-rose-300">Erro ao carregar saldos bancários</p>
        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{erroBancos}</p>
        <p className="text-[10px] text-slate-700 mt-1">Verifique se o servidor local está ativo e o endpoint /dw-bancos foi criado.</p>
      </div>
      <button onClick={recarregarContas}
        className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors">
        <RefreshCcw className="h-3.5 w-3.5" /> Tentar novamente
      </button>
    </div>
  );

  if (contas.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-400/10 bg-slate-400/[0.05]">
        <Landmark className="h-6 w-6 text-slate-600" />
      </div>
      <div className="text-center max-w-[360px]">
        <p className="text-[13px] font-semibold text-slate-400">Nenhuma conta encontrada</p>
        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">Nenhuma movimentação bancária no período selecionado, ou o endpoint /dw-bancos não está respondendo.</p>
      </div>
      <button onClick={recarregarContas}
        className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors">
        <RefreshCcw className="h-3.5 w-3.5" /> Recarregar
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPIs Consolidados ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Saldo Consolidado",
            value: fmtBRL(saldoTotal),
            sub: `${contas.length} conta${contas.length !== 1 ? "s" : ""} ativas`,
            icon: Landmark, stripe: "from-cyan-400/60 to-cyan-700/20",
            iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]", iconTxt: "text-cyan-300",
            glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
          },
          {
            label: "Entradas no Período",
            value: fmtK(contas.reduce((s, c) => s + c.entradas_mes, 0)),
            sub: `Créditos no período`,
            icon: TrendingUp, stripe: "from-emerald-400/60 to-emerald-700/20",
            iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300",
            glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]",
          },
          {
            label: "Saídas no Período",
            value: fmtK(contas.reduce((s, c) => s + c.saidas_mes, 0)),
            sub: `Débitos no período`,
            icon: TrendingDown, stripe: "from-rose-400/60 to-rose-700/20",
            iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300",
            glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",
          },
        ].map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* ── View Mode Toggle ── */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-0.5">
          {([
            { id: "cards"     as BancoViewMode, icon: LayoutGrid, label: "Cards" },
            { id: "tabela"    as BancoViewMode, icon: Table2,     label: "Tabela" },
            { id: "analytics" as BancoViewMode, icon: BarChart3,  label: "Analytics" },
          ] as { id: BancoViewMode; icon: React.ElementType; label: string }[]).map(t => {
            const Icon = t.icon;
            const active = viewMode === t.id;
            return (
              <button key={t.id} onClick={() => { setViewMode(t.id); setExpandedCard(null); }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${active ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500 hover:text-slate-300"}`}>
                <Icon className="h-3 w-3" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Saldo Consolidado + Evolução ── */}
      <AnimatedCard delay={180}>
        <SectionCard>
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--sgt-divider)]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/70">Saldo Consolidado</p>
              <p className="text-[28px] font-black text-cyan-300 leading-none mt-1 tabular-nums">{fmtBRL(saldoTotal)}</p>
              <p className="text-[11px] text-slate-600 mt-1">{contas.length} conta{contas.length !== 1 ? "s" : ""} ativas · atualizado agora</p>
            </div>
            <div style={{ width: 220, height: 64 }}>
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
          {/* Mini-totais por conta — scroll horizontal se > 4 */}
          <div className="flex divide-x divide-[var(--sgt-divider)] overflow-x-auto">
            {contas.map((c, i) => {
              const p = PALETA[i % PALETA.length];
              return (
                <button key={c.cod_conta} onClick={() => { setExtratoKey(c.cod_conta); setExtratoPage(1); }}
                  className={`flex-shrink-0 min-w-[140px] px-4 py-2.5 text-left transition-colors ${extratoKey === c.cod_conta ? "bg-[var(--sgt-row-hover)]" : "hover:bg-[var(--sgt-row-hover)]"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <BankLogo
                      nome={c.nome_banco}
                      codigo={c.cod_banco}
                      sigla={(c.nome_banco ?? c.nome_conta).slice(0,2).toUpperCase()}
                      size={18}
                      rounded="rounded-md"
                    />
                    <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{c.nome_banco || c.nome_conta}</span>
                  </div>
                  <p className={`text-[14px] font-black leading-none tabular-nums ${p.val}`}>{fmtK(c.saldo_atual)}</p>
                  <p className="text-[9px] text-slate-600 mt-1">{c.tipo_conta || "CC"}</p>
                </button>
              );
            })}
          </div>
        </SectionCard>
      </AnimatedCard>

      {/* ══════════════════════════════════════════════════════ */}
      {/* VIEW: CARDS                                            */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "cards" && <>
      {/* ── Cards por conta ── */}
      <div className={`grid gap-3 transition-all duration-300 ${
        expandedCard
          ? "grid-cols-1 sm:grid-cols-1"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }`}>
        {(expandedCard
          ? contas.filter(ct => ct.cod_conta === expandedCard)
          : contas
        ).map((c, i) => {
          const p = PALETA[i % PALETA.length];
          const tipoClass = tipoLabel[c.tipo_conta] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400";
          const sigla = c.nome_banco ? c.nome_banco.slice(0,2).toUpperCase() : c.nome_conta.slice(0,2).toUpperCase();
          const isExpanded = expandedCard === c.cod_conta;
          return (
            <AnimatedCard key={c.cod_conta} delay={expandedCard ? 0 : i * 80}>
              <div
                className={`rounded-[14px] border bg-[var(--sgt-bg-card)] p-3.5 ${p.border} cursor-pointer
                  transition-all duration-200 hover:brightness-110
                  ${isExpanded ? "ring-1 ring-amber-400/30 shadow-[0_0_30px_rgba(251,191,36,0.08)]" : ""}`}
                onClick={() => {
                  if (isExpanded) {
                    setExpandedCard(null);
                  } else {
                    setExpandedCard(c.cod_conta);
                    setExtratoKey(c.cod_conta);
                  }
                }}>
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <BankLogo nome={c.nome_banco} codigo={c.cod_banco} sigla={sigla} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-200 truncate">
                      {c.nome_banco || c.nome_conta}
                    </p>
                    <p className="text-[10px] text-slate-600 truncate">
                      {c.agencia ? `Ag. ${c.agencia} · ` : ""}{c.tipo_conta || "CC"} {c.num_conta}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${tipoClass}`}>
                      {c.tipo_conta || "CC"}
                    </span>
                    {isExpanded && (
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedCard(null); }}
                        className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Voltar para todos os cards">
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Saldo */}
                <div className="mb-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-600">Saldo disponível</p>
                  <p className={`text-[clamp(1.1rem,2vw,1.4rem)] font-black leading-none tabular-nums mt-0.5 ${p.val}`}>
                    {fmtBRL(c.saldo_atual)}
                  </p>
                </div>
                {/* Detalhes */}
                <div className="flex flex-col gap-1 border-t border-[var(--sgt-divider)] pt-2.5">
                  {[
                    { label: "Saldo anterior",  value: fmtK(c.saldo_anterior ?? 0),                                                  clr: "text-slate-400" },
                    { label: "Entradas no mês", value: `+${fmtK(c.entradas_mes)}`,                                                   clr: "text-emerald-300" },
                    { label: "Saídas no mês",   value: c.saidas_mes > 0 ? `-${fmtK(c.saidas_mes)}` : "—", clr: c.saidas_mes > 0 ? "text-rose-300" : "text-slate-500" },
                    { label: "Lançamentos",     value: extratoKey === c.cod_conta ? String(extratoData.length) : "—",                clr: "text-slate-300" },
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

      {/* ── Extrato — visível apenas quando um card está expandido ── */}
      {expandedCard && <div className="animate-[fade-slide-down_0.25s_ease-out]">
      <SectionCard>
          {/* Tab strip — oculto quando há card expandido (extrato já identificado pelo card) */}
          {!expandedCard && (
          <div className="flex items-center border-b border-[var(--sgt-divider)] px-4 pt-1 overflow-x-auto">
            {contas.map((ct) => {
              const sigla = ct.nome_banco ? ct.nome_banco.slice(0,2).toUpperCase() : ct.nome_conta.slice(0,2).toUpperCase();
              return (
                <button key={ct.cod_conta} onClick={() => { setExtratoKey(ct.cod_conta); setExtratoPage(1); }}
                  className={`flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                    extratoKey === ct.cod_conta ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}>
                  <BankLogo nome={ct.nome_banco} codigo={ct.cod_banco} sigla={sigla} size={16} rounded="rounded" />
                  {ct.nome_banco || ct.nome_conta}
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
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 border-b border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-500">
              {contaAtiva ? (
                <>
                  <span className="text-slate-400 font-medium">{contaAtiva.nome_banco || contaAtiva.nome_conta}</span>
                  {contaAtiva.agencia ? <span className="text-slate-600"> · Ag. {contaAtiva.agencia}</span> : null}
                  {contaAtiva.num_conta ? <span className="text-slate-600"> · Cta. {contaAtiva.num_conta}</span> : null}
                  <span className="text-slate-600"> · {loadingExtrato ? "carregando…" : `${extratoRows.length} lançamento${extratoRows.length !== 1 ? "s" : ""}${extratoPaginas > 1 ? ` · pág. ${extratoPage}/${extratoPaginas}` : ""}`}</span>
                </>
              ) : "Nenhuma conta selecionada"}
            </span>
            {contaAtiva && (
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-emerald-300 font-semibold">+{fmtK(contaAtiva.entradas_mes)}</span>
                <span className="text-slate-600">entradas</span>
                <span className="text-rose-300 font-semibold">-{fmtK(contaAtiva.saidas_mes)}</span>
                <span className="text-slate-600">saídas</span>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loadingExtrato && (
            <div className="flex items-center justify-center py-10 gap-2 text-[12px] text-slate-600">
              <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Carregando lançamentos...
            </div>
          )}

          {/* Lista paginada — 50 por página */}
          {!loadingExtrato && extratoPageRows.map((r, i) => {
            const isC  = r.ORIGEM === "LB_C";
            const val  = Math.abs(r.VLRDOC ?? 0);
            const TIPDOC_LABEL: Record<string,string> = {
              LB: "Lançamento Bancário", BOL: "Boleto", PIX: "PIX", TED: "TED",
              DOC: "DOC", TRA: "Transferência", DEB: "Débito", CHQ: "Cheque",
              DEP: "Depósito", TAR: "Tarifa", IOF: "IOF", JUR: "Juros",
            };
            const tipoDesc = r.TIPO_DOCUMENTO ? (TIPDOC_LABEL[r.TIPO_DOCUMENTO] ?? r.TIPO_DOCUMENTO) : null;
            const desc = (r.HISTORICO || null)
              ?? (r.ANALITICA || null)
              ?? (r.CENTRO_CUSTO || null)
              ?? (tipoDesc && r.DOCUMENTO ? `${tipoDesc} nº ${r.DOCUMENTO}` : null)
              ?? (r.DOCUMENTO ? `Doc. ${r.DOCUMENTO}` : null)
              ?? "Lançamento sem histórico";
            const dataExib = r.DATA_LANCAMENTO ?? r.DATA_COMPENSACAO;
            const meta = [
              dataExib ? fmtDate(dataExib.slice(0,10)) : null,
              r.DOCUMENTO ? `Doc. ${r.DOCUMENTO}` : null,
              r.CENTRO_CUSTO && r.CENTRO_CUSTO !== desc ? r.CENTRO_CUSTO : null,
            ].filter(Boolean).join(" · ") || "—";
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                <div className={`h-2 w-2 rounded-full shrink-0 ${isC ? "bg-emerald-400" : "bg-rose-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-300 truncate">{desc}</p>
                  <p className="text-[10px] text-slate-600 truncate">{meta}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className={`text-[13px] font-semibold tabular-nums ${isC ? "text-emerald-300" : "text-rose-300"}`}>
                    {isC ? "+" : "-"}{fmtBRL(val)}
                  </p>
                  {tipoDesc && <p className="text-[9px] text-slate-600 mt-0.5">{tipoDesc}</p>}
                </div>
              </div>
            );
          })}

          {/* Estado vazio */}
          {!loadingExtrato && extratoRows.length === 0 && (
            <p className="px-4 py-8 text-center text-[12px] text-slate-600">
              Nenhum lançamento no período para esta conta
            </p>
          )}

          {/* Paginação */}
          {extratoPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--sgt-divider)]">
              <span className="text-[11px] text-slate-600">
                {(extratoPage - 1) * EXTRATO_PAGE_SIZE + 1}–{Math.min(extratoPage * EXTRATO_PAGE_SIZE, extratoRows.length)} de {extratoRows.length} lançamentos
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExtratoPage(p => Math.max(1, p - 1))}
                  disabled={extratoPage === 1}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium border border-[var(--sgt-border-subtle)] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="h-3 w-3" /> Anterior
                </button>
                <span className="px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                  {extratoPage} / {extratoPaginas}
                </span>
                <button
                  onClick={() => setExtratoPage(p => Math.min(extratoPaginas, p + 1))}
                  disabled={extratoPage === extratoPaginas}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium border border-[var(--sgt-border-subtle)] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Próximo <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
      </SectionCard>
      </div>}
      </> /* end viewMode === "cards" */}

      {/* ══════════════════════════════════════════════════════ */}
      {/* VIEW: TABELA                                          */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "tabela" && (
        <AnimatedCard>
          <SectionCard>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--sgt-divider)]">
                    {["Banco","Conta","Agência","Filial","Saldo Anterior","Entradas","Saídas","Saldo Atual"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c2, i) => {
                    const saldoClr = c2.saldo_atual >= 0 ? "text-emerald-300" : "text-rose-300";
                    return (
                      <tr key={i} onClick={() => { setViewMode("cards"); setExtratoKey(c2.cod_conta); }}
                        className="border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] cursor-pointer transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <BankLogo nome={c2.nome_banco} codigo={c2.cod_banco}
                              sigla={(c2.nome_banco || c2.nome_conta).slice(0,2).toUpperCase()} size={24} />
                            <span className="text-slate-300 font-medium truncate max-w-[140px]">{c2.nome_banco || c2.nome_conta}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono">{c2.cod_conta}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c2.agencia || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c2.nome_filial || c2.filial}</td>
                        <td className="px-4 py-2.5 text-slate-400 tabular-nums">{fmtBRL(c2.saldo_anterior ?? 0)}</td>
                        <td className="px-4 py-2.5 text-emerald-300 tabular-nums font-medium">+{fmtBRL(c2.entradas_mes)}</td>
                        <td className="px-4 py-2.5 text-rose-300 tabular-nums font-medium">{c2.saidas_mes > 0 ? `-${fmtBRL(c2.saidas_mes)}` : "—"}</td>
                        <td className={`px-4 py-2.5 tabular-nums font-bold ${saldoClr}`}>{fmtBRL(c2.saldo_atual)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--sgt-divider)] bg-[var(--sgt-row-hover)]">
                    <td colSpan={4} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Total — {contas.length} conta{contas.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 tabular-nums font-bold">
                      {fmtBRL(contas.reduce((s, x) => s + (x.saldo_anterior ?? 0), 0))}
                    </td>
                    <td className="px-4 py-2.5 text-emerald-300 tabular-nums font-bold">
                      +{fmtBRL(contas.reduce((s, x) => s + x.entradas_mes, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-rose-300 tabular-nums font-bold">
                      -{fmtBRL(contas.reduce((s, x) => s + x.saidas_mes, 0))}
                    </td>
                    <td className={`px-4 py-2.5 tabular-nums font-bold ${saldoTotal >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {fmtBRL(saldoTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>
        </AnimatedCard>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* VIEW: ANALYTICS                                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Saldo por banco — barra horizontal */}
          <AnimatedCard>
            <SectionCard>
              <p className="px-5 pt-4 pb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400/70 border-b border-[var(--sgt-divider)]">
                Saldo Atual por Conta
              </p>
              <div className="p-4 space-y-2">
                {[...contas].sort((a,b) => b.saldo_atual - a.saldo_atual).slice(0,10).map((ct, i) => {
                  const max = Math.max(...contas.map(x => Math.abs(x.saldo_atual)));
                  const pct = max > 0 ? Math.abs(ct.saldo_atual) / max * 100 : 0;
                  const pos = ct.saldo_atual >= 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <BankLogo nome={ct.nome_banco} codigo={ct.cod_banco}
                        sigla={(ct.nome_banco || ct.nome_conta).slice(0,2).toUpperCase()} size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{ct.nome_banco || ct.nome_conta}</span>
                          <span className={`text-[11px] font-bold tabular-nums ml-2 shrink-0 ${pos ? "text-emerald-300" : "text-rose-300"}`}>{fmtK(ct.saldo_atual)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pos ? "bg-emerald-400/70" : "bg-rose-400/70"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </AnimatedCard>

          {/* Entradas vs Saídas — barra comparativa */}
          <AnimatedCard delay={60}>
            <SectionCard>
              <p className="px-5 pt-4 pb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/70 border-b border-[var(--sgt-divider)]">
                Entradas vs Saídas no Período
              </p>
              <div className="p-4 space-y-3">
                {contas.filter(ct => ct.entradas_mes > 0 || ct.saidas_mes > 0)
                  .sort((a,b) => (b.entradas_mes + b.saidas_mes) - (a.entradas_mes + a.saidas_mes))
                  .slice(0,8).map((ct, i) => {
                  const maxVal = Math.max(...contas.map(x => Math.max(x.entradas_mes, x.saidas_mes)));
                  const pctE = maxVal > 0 ? ct.entradas_mes / maxVal * 100 : 0;
                  const pctS = maxVal > 0 ? ct.saidas_mes   / maxVal * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{ct.nome_banco || ct.nome_conta}</span>
                        <span className="text-[10px] text-slate-600 ml-2 shrink-0">{fmtK(ct.entradas_mes)} / {fmtK(ct.saidas_mes)}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="h-full rounded-full bg-emerald-400/60 transition-all" style={{ width: `${pctE}%` }} />
                        <div className="h-full rounded-full bg-rose-400/60 transition-all"    style={{ width: `${pctS}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </AnimatedCard>

          {/* Distribuição de saldo — área chart */}
          <AnimatedCard delay={120} className="lg:col-span-2">
            <SectionCard>
              <p className="px-5 pt-4 pb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400/70 border-b border-[var(--sgt-divider)]">
                Distribuição do Saldo Consolidado
              </p>
              <div className="p-4" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contas.filter(ct => ct.saldo_atual !== 0).map(ct => ({
                    name: (ct.nome_banco || ct.nome_conta).slice(0, 12),
                    saldo: ct.saldo_atual,
                    fill: ct.saldo_atual >= 0 ? "#34d399" : "#f87171",
                  }))} margin={{ top: 4, right: 8, left: 8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }}
                      angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }}
                      tickFormatter={(v) => fmtK(v)} width={60} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} labelStyle={{ color: "#cbd5e1" }}
                      contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="saldo" radius={[4,4,0,0]}>
                      {contas.filter(ct => ct.saldo_atual !== 0).map((ct, i) => (
                        <Cell key={i} fill={ct.saldo_atual >= 0 ? "#34d39966" : "#f8717166"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR CONFIG
// ─────────────────────────────────────────────────────────────────────────────
type ScreenId = "painel" | "pagar" | "receber" | "conciliacao" | "fluxo" | "previsto" | "relatorios" | "fornecedores" | "clientes" | "categorias" | "bancos";

const NAV: { id: string; label: string; icon: React.ElementType; badge?: number; badgeColor?: "amber" | "rose"; section?: string; externalTo?: string }[] = [
  { id: "painel",       label: "Painel",           icon: LayoutDashboard, section: "Financeiro" },
  { id: "pagar",        label: "Contas a Pagar",   icon: ArrowDownCircle },
  { id: "receber",      label: "Contas a Receber", icon: ArrowUpCircle },
  { id: "conciliacao",  label: "Conciliação",      icon: RefreshCcw },
  { id: "fluxo",        label: "Realizado",        icon: Activity,        externalTo: "/dashboard" },
  { id: "previsto",     label: "Previsto",         icon: TrendingUp },
  { id: "relatorios",   label: "Relatórios",       icon: FileBarChart },

  { id: "fornecedores", label: "Fornecedores",     icon: Building2,       section: "Cadastros" },
  { id: "clientes",     label: "Clientes",         icon: Users },
  { id: "categorias",   label: "Categorias",       icon: Tag },
  { id: "bancos",       label: "Bancos",           icon: Landmark },

  // ── Acessos externos ────────────────────────────────────────────────
  { id: "ext-executivo",    label: "Painel Executivo",       icon: Briefcase,       section: "Gestão",     externalTo: "/executivo" },
  { id: "ext-indicadores",  label: "Indicadores",            icon: LineChartIcon,   externalTo: "/indicadores" },
  { id: "ext-faturamento",  label: "Faturamento",            icon: Banknote,        externalTo: "/faturamento" },

  { id: "ext-operacional",  label: "Operacional",            icon: MapPin,          section: "Operação",   externalTo: "/operacional" },
  { id: "ext-frota",        label: "Gestão de Frota",        icon: Truck,           externalTo: "/frota" },
  { id: "ext-fin-frota",    label: "Financiamentos",         icon: Wallet,          externalTo: "/financiamento-frota" },
  { id: "ext-manutencao",   label: "Manutenção",             icon: Wrench,          externalTo: "/manutencao" },
  { id: "ext-abastecimento",label: "Abastecimento",          icon: Fuel,            externalTo: "/abastecimento" },

  { id: "ext-compras",      label: "Compras",                icon: ShoppingCart,    section: "Compras",    externalTo: "/compras" },

  { id: "ext-rh",           label: "RH",                     icon: UserCog,         section: "RH",         externalTo: "/rh" },

  { id: "ext-chamados",     label: "Chamados",               icon: Headphones,      section: "Suporte",    externalTo: "/chamados" },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const screenParam = (searchParams.get("s") as ScreenId) ?? "painel";
  const [active, _setActive] = useState<ScreenId>(screenParam);
  const navigate = useNavigate();

  // Sincroniza estado interno ⇄ URL (?s=)
  useEffect(() => { _setActive(screenParam); }, [screenParam]);
  const setActive = (id: ScreenId) => {
    const next = new URLSearchParams(searchParams);
    next.set("s", id);
    setSearchParams(next, { replace: true });
  };

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
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                <span className="text-[15px] font-black tracking-[-0.03em] text-white">{meta.title}</span>
              </div>
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
            <div className="flex items-center gap-2">
              <MobileNav />
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img src={sgtLogo} alt="SGT" className="h-7 w-auto shrink-0" />
                <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] text-white truncate">{meta.title}</span>
                </div>
              </div>
              <HomeButton />
            </div>
            <div className="flex items-center gap-2">
              <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Início" />
              <DatePickerInput value={dwFilter.dataFim}   onChange={v => setDwFilter("dataFim", v)}   placeholder="Fim" />
              <UpdateButton onClick={fetchFromDW} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} compact />
            </div>
          </div>

          {/* ── BODY: a sidebar global vive em AppLayout; aqui apenas o conteúdo ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <main className="flex-1 overflow-y-auto p-4">
              {getScreen(active)}
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}
