import { useState, useMemo } from "react";
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
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import sgtLogo from "@/assets/sgt-logo.png";

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


const CLIENTES = [
  { id: 1,  nome: "Transpolog Ltda",       cnpj: "09.241.885/0001-12", segmento: "Transportadora",  status: "Ativo",        faturamento12m: 420000, titulosAbertos: 2, prazoMedio: 30, inadimplente: false, avatar: "TL", cidade: "São Paulo, SP",     contato: "Carlos Mendes" },
  { id: 2,  nome: "Veloz Express",         cnpj: "17.332.091/0001-48", segmento: "Courier",          status: "Ativo",        faturamento12m: 188000, titulosAbertos: 1, prazoMedio: 28, inadimplente: false, avatar: "VE", cidade: "Campinas, SP",      contato: "Ana Rodrigues" },
  { id: 3,  nome: "Cargo Rápido",          cnpj: "22.018.443/0001-90", segmento: "Frete Rodoviário", status: "Ativo",        faturamento12m: 112000, titulosAbertos: 1, prazoMedio: 35, inadimplente: false, avatar: "CR", cidade: "Ribeirão Preto, SP", contato: "Pedro Lima" },
  { id: 4,  nome: "RodoLog S.A.",          cnpj: "31.029.774/0001-66", segmento: "Logística",        status: "Ativo",        faturamento12m: 504000, titulosAbertos: 1, prazoMedio: 30, inadimplente: false, avatar: "RL", cidade: "Santos, SP",        contato: "Mariana Costa" },
  { id: 5,  nome: "Brilho Frete",          cnpj: "48.332.110/0001-22", segmento: "Frete Rodoviário", status: "Ativo",        faturamento12m: 222000, titulosAbertos: 0, prazoMedio: 28, inadimplente: false, avatar: "BF", cidade: "Curitiba, PR",      contato: "João Faria" },
  { id: 6,  nome: "Paraíso Frotas",        cnpj: "55.817.009/0001-37", segmento: "Gestão de Frota",  status: "Ativo",        faturamento12m: 398000, titulosAbertos: 1, prazoMedio: 45, inadimplente: false, avatar: "PF", cidade: "Porto Alegre, RS",  contato: "Sílvia Borges" },
  { id: 7,  nome: "LogMax Transportes",    cnpj: "62.114.882/0001-55", segmento: "Transportadora",  status: "Inadimplente", faturamento12m:  93000, titulosAbertos: 2, prazoMedio: 30, inadimplente: true,  avatar: "LM", cidade: "Goiânia, GO",       contato: "Roberto Alves" },
  { id: 8,  nome: "DeltaCargo Ltda",       cnpj: "71.334.900/0001-81", segmento: "Courier",          status: "Ativo",        faturamento12m: 145000, titulosAbertos: 1, prazoMedio: 20, inadimplente: false, avatar: "DC", cidade: "Belo Horizonte, MG", contato: "Fernanda Souza" },
  { id: 9,  nome: "TotalFrete S.A.",       cnpj: "83.210.447/0001-73", segmento: "Frete Rodoviário", status: "Inativo",      faturamento12m:  31000, titulosAbertos: 0, prazoMedio: 30, inadimplente: false, avatar: "TF", cidade: "Fortaleza, CE",     contato: "Diego Pinto" },
  { id: 10, nome: "SupremaLog",            cnpj: "04.882.113/0001-40", segmento: "Logística",        status: "Ativo",        faturamento12m: 267000, titulosAbertos: 2, prazoMedio: 30, inadimplente: false, avatar: "SL", cidade: "Manaus, AM",        contato: "Camila Torres" },
  { id: 11, nome: "NovaCarga Express",     cnpj: "19.003.228/0001-16", segmento: "Courier",          status: "Inadimplente", faturamento12m:  58000, titulosAbertos: 3, prazoMedio: 28, inadimplente: true,  avatar: "NC", cidade: "Recife, PE",        contato: "Thiago Nunes" },
];

const FORNECEDORES = [
  { id: 1,  nome: "Petrobras Distribuidora",  cnpj: "33.000.167/0001-01", categoria: "Combustível",      status: "Ativo",      volume12m: 480000, titulos: 3, prazo: 28, avatar: "PD" },
  { id: 2,  nome: "Auto Posto Estrela",       cnpj: "12.445.901/0001-22", categoria: "Combustível",      status: "Ativo",      volume12m: 220000, titulos: 2, prazo: 15, avatar: "AE" },
  { id: 3,  nome: "Pneus Brasil Ltda",        cnpj: "21.118.077/0001-33", categoria: "Manutenção",       status: "Ativo",      volume12m: 138000, titulos: 1, prazo: 30, avatar: "PB" },
  { id: 4,  nome: "Mecânica Diesel Forte",    cnpj: "44.882.331/0001-44", categoria: "Manutenção",       status: "Ativo",      volume12m:  92000, titulos: 2, prazo: 30, avatar: "MD" },
  { id: 5,  nome: "TecSys Sistemas",          cnpj: "55.317.220/0001-55", categoria: "Tecnologia",       status: "Ativo",      volume12m:  64000, titulos: 1, prazo: 30, avatar: "TS" },
  { id: 6,  nome: "Energisa Distribuição",    cnpj: "06.882.110/0001-66", categoria: "Utilidades",       status: "Ativo",      volume12m:  48000, titulos: 1, prazo: 10, avatar: "ED" },
  { id: 7,  nome: "Sabesp",                   cnpj: "43.776.517/0001-80", categoria: "Utilidades",       status: "Ativo",      volume12m:  18000, titulos: 0, prazo: 10, avatar: "SB" },
  { id: 8,  nome: "Office Supplies Ltda",     cnpj: "77.220.991/0001-77", categoria: "Tecnologia",       status: "Bloqueado",  volume12m:  12000, titulos: 4, prazo: 30, avatar: "OS" },
  { id: 9,  nome: "Lubrax Comércio",          cnpj: "88.117.404/0001-88", categoria: "Combustível",      status: "Ativo",      volume12m:  86000, titulos: 1, prazo: 21, avatar: "LC" },
  { id: 10, nome: "Auto Peças Líder",         cnpj: "99.443.882/0001-99", categoria: "Manutenção",       status: "Inativo",    volume12m:  22000, titulos: 0, prazo: 30, avatar: "AP" },
  { id: 11, nome: "Cloud Pro Solutions",      cnpj: "10.554.778/0001-10", categoria: "Tecnologia",       status: "Ativo",      volume12m:  41000, titulos: 1, prazo: 30, avatar: "CP" },
  { id: 12, nome: "RH Mais Consultoria",      cnpj: "23.665.001/0001-23", categoria: "Pessoal",          status: "Ativo",      volume12m:  35000, titulos: 0, prazo: 15, avatar: "RM" },
];

const CATEGORIAS = [
  { id: 1, nome: "Combustível e Lubrificantes", tipo: "Despesa", icon: Flame, valor: 199325, pct: 70, cor: "amber", qtd: 14, fornecedores: 3 },
  { id: 2, nome: "Manutenção e Reparos", tipo: "Despesa", icon: Wrench, valor: 34170, pct: 12, cor: "blue", qtd: 8, fornecedores: 5 },
  { id: 3, nome: "Tecnologia e Sistemas", tipo: "Despesa", icon: Zap, valor: 25620, pct: 9, cor: "violet", qtd: 5, fornecedores: 4 },
  { id: 4, nome: "Utilidades (Energia, Água)", tipo: "Despesa", icon: Bolt, valor: 14235, pct: 5, cor: "teal", qtd: 3, fornecedores: 2 },
  { id: 5, nome: "Pessoal e Encargos", tipo: "Despesa", icon: Users, valor: 11400, pct: 4, cor: "rose", qtd: 12, fornecedores: 1 },
  { id: 6, nome: "Fretes e Transportes", tipo: "Receita", icon: Truck, valor: 326196, pct: 78, cor: "emerald", qtd: 41, fornecedores: 18 },
  { id: 7, nome: "Armazenagem e Logística", tipo: "Receita", icon: Package, valor: 92004, pct: 22, cor: "cyan", qtd: 9, fornecedores: 6 },
];

const BANCOS = [
  { id: 1, nome: "Banco do Brasil", sigla: "BB", agencia: "3281-2", conta: "14.882-0", saldo: 312440, entradas: 189450, saidas: 158230, agendado: 42340, tipo: "Principal", cor: "amber" },
  { id: 2, nome: "Bradesco", sigla: "BV", agencia: "0091-0", conta: "42.914-5", saldo: 87130, entradas: 42250, saidas: 20920, agendado: 12340, tipo: "Movimento", cor: "rose" },
  { id: 3, nome: "Itaú BBA", sigla: "IT", agencia: "0140-3", conta: "88.120-2", saldo: 245000, entradas: 5120, saidas: 0, agendado: 0, tipo: "Investimento", cor: "violet" },
  { id: 4, nome: "Caixa Econômica", sigla: "CA", agencia: "0422-1", conta: "10.334-7", saldo: 54200, entradas: 18000, saidas: 12800, agendado: 4200, tipo: "Movimento", cor: "teal" },
];

const EXTRATO = [
  { desc: "Recebimento TED · RodoLog S.A.", meta: "10/05/2025 · C.Receber BOL-041200", valor: 42000, tipo: "C" },
  { desc: "Débito · Pgto NF-004821 Petrobras", meta: "02/05/2025 · C.Pagar liquidada", valor: -14320, tipo: "D" },
  { desc: "PIX recebido · Transpolog Ltda", meta: "05/05/2025 · C.Receber NF-008812", valor: 28400, tipo: "C" },
  { desc: "Boleto · Correios NF-021788", meta: "08/05/2025 · C.Pagar", valor: -7850, tipo: "D" },
  { desc: "Tarifa bancária", meta: "07/05/2025 · Lançamento automático", valor: -48.90, tipo: "D" },
  { desc: "TED recebida · Veloz Express", meta: "12/05/2025 · C.Receber DUP-004422", valor: 15700, tipo: "C" },
];

const SALDO_HISTORICO = [
  { dia: "01/05", BB: 290000, BV: 65000, IT: 242000, CA: 48000 },
  { dia: "05/05", BB: 312000, BV: 72000, IT: 243000, CA: 50000 },
  { dia: "10/05", BB: 338000, BV: 80000, IT: 244000, CA: 52000 },
  { dia: "13/05", BB: 312440, BV: 87130, IT: 245000, CA: 54200 },
];

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
  const { contasPagar, contasReceber, resumo, isFetchingDw } = useFinancialData();

  const totalPagar   = resumo.contasPagar.saldoAPagar;
  const totalReceber = resumo.contasReceber.saldoAReceber;
  const saldoBancos  = BANCOS.reduce((s, b) => s + b.saldo, 0);
  const saldo        = totalReceber - totalPagar;

  const vencidosPagar     = contasPagar.filter(c => dsPagar(c) === "Vencido").reduce((s,c) => s+c.valor, 0);
  const atrasadosReceber  = contasReceber.filter(c => dsReceber(c) === "Em Atraso").reduce((s,c) => s+c.valor, 0);

  const kpis = [
    { label: "Saldo em Bancos",    value: fmtK(saldoBancos),         sub: `${BANCOS.length} contas ativas`,                             icon: Landmark,     stripe: "from-cyan-400/60 to-cyan-700/20",    iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]"   },
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
            <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-cyan-400" />Posição bancária</span>
            <button onClick={() => onNavigate?.("bancos")} className="text-[10px] text-slate-600 hover:text-amber-300 transition-colors flex items-center gap-0.5">Ver extrato <ChevronRight className="h-3 w-3" /></button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[var(--sgt-divider)]">
            {BANCOS.map(b => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2"><BankLogo sigla={b.sigla} size={20} /><span className="text-[10px] text-slate-600 truncate">{b.nome}</span></div>
                <p className="text-[15px] font-black text-white leading-none tabular-nums">{fmtK(b.saldo)}</p>
                <p className="text-[10px] text-slate-600 mt-1">{b.tipo}</p>
              </div>
            ))}
          </div>
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


function ScreenFornecedores() {
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const filtered = useMemo(() =>
    FORNECEDORES.filter(f => {
      const q = search.toLowerCase();
      const matchQ = !q || f.nome.toLowerCase().includes(q) || f.cnpj.includes(q);
      const matchC = filtroCategoria === "todos" || f.categoria === filtroCategoria;
      const matchS = filtroStatus   === "todos" || f.status    === filtroStatus;
      return matchQ && matchC && matchS;
    }),
    [search, filtroCategoria, filtroStatus]
  );

  const totalAtivos    = FORNECEDORES.filter(f => f.status === "Ativo").length;
  const totalBloqueados = FORNECEDORES.filter(f => f.status === "Bloqueado").length;
  const volumeTotal    = FORNECEDORES.reduce((s, f) => s + f.volume12m, 0);
  const titulosAbertos = FORNECEDORES.reduce((s, f) => s + f.titulos, 0);
  const categorias     = [...new Set(FORNECEDORES.map(f => f.categoria))];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Fornecedores", value: String(FORNECEDORES.length),  sub: `${totalAtivos} ativos`,                    icon: Building2,     stripe: "from-blue-400/60 to-blue-700/20",    iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]",    iconTxt: "text-blue-300",    glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]",  delay: 0   },
          { label: "Volume Comprado 12m",   value: fmtK(volumeTotal),            sub: "Total de pagamentos realizados",           icon: TrendingDown,  stripe: "from-amber-400/60 to-amber-700/20",  iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",  iconTxt: "text-amber-300",   glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]",  delay: 60  },
          { label: "Títulos em Aberto",     value: String(titulosAbertos),       sub: "Pagamentos pendentes",                     icon: Clock,         stripe: "from-rose-400/60 to-rose-700/20",    iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",   delay: 120 },
          { label: "Bloqueados / Inativos", value: String(totalBloqueados),      sub: `de ${FORNECEDORES.length} fornecedores`,   icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20",    iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",   delay: 180 },
        ].map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <FilterBar search={search} onSearch={setSearch}>
        <div className="h-4 w-px bg-[var(--sgt-divider)]" />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none">
          <option value="todos">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none">
          <option value="todos">Status: Todos</option>
          <option value="Ativo">Ativo</option>
          <option value="Bloqueado">Bloqueado</option>
          <option value="Inativo">Inativo</option>
        </select>
        <span className="text-[11px] text-slate-600 ml-1">{filtered.length} fornecedores</span>
      </FilterBar>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((f, i) => (
          <AnimatedCard key={f.id} delay={i * 60}>
            <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 cursor-pointer hover:border-[var(--sgt-border-medium)] transition-all">
              <div className="flex items-center gap-3">
                <Avatar initials={f.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-200 truncate">{f.nome}</p>
                  <p className="text-[10px] text-slate-600">{f.cnpj}</p>
                </div>
                <StatusBadge s={f.status} />
              </div>
              <p className="text-[11px] text-slate-600">{f.categoria}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Últimos 12m", value: fmtK(f.volume12m), clr: "text-blue-300" },
                  { label: "Em aberto", value: String(f.titulos), clr: f.titulos > 2 ? "text-rose-300" : f.titulos > 0 ? "text-amber-300" : "text-slate-300" },
                  { label: "Prazo médio", value: `${f.prazo}d`, clr: "text-slate-300" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-[var(--sgt-table-head)] px-2 py-1.5">
                    <p className="text-[9px] text-slate-600">{s.label}</p>
                    <p className={`text-[12px] font-semibold ${s.clr}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
}

function ScreenClientes() {
  const [search, setSearch] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const segmentos = [...new Set(CLIENTES.map(c => c.segmento))];

  const filtered = useMemo(() =>
    CLIENTES.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q || c.nome.toLowerCase().includes(q) || c.cnpj.includes(q) || c.contato.toLowerCase().includes(q);
      const matchSeg = filtroSegmento === "todos" || c.segmento === filtroSegmento;
      const matchSt  = filtroStatus   === "todos" || c.status   === filtroStatus;
      return matchQ && matchSeg && matchSt;
    }),
    [search, filtroSegmento, filtroStatus]
  );

  const totalAtivos      = CLIENTES.filter(c => c.status === "Ativo").length;
  const totalInadimplentes = CLIENTES.filter(c => c.inadimplente).length;
  const faturamentoTotal = CLIENTES.reduce((s, c) => s + c.faturamento12m, 0);
  const titulosAbertos   = CLIENTES.reduce((s, c) => s + c.titulosAbertos, 0);

  const segCor: Record<string, string> = {
    "Transportadora":  "bg-blue-400/10 border-blue-400/20 text-blue-300",
    "Courier":         "bg-teal-400/10 border-teal-400/20 text-teal-300",
    "Frete Rodoviário":"bg-amber-400/10 border-amber-400/20 text-amber-300",
    "Logística":       "bg-violet-400/10 border-violet-400/20 text-violet-300",
    "Gestão de Frota": "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
  };

  const avCor: Record<string, string> = {
    TL: "bg-blue-400/10 border-blue-400/20 text-blue-300",
    VE: "bg-teal-400/10 border-teal-400/20 text-teal-300",
    CR: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    RL: "bg-violet-400/10 border-violet-400/20 text-violet-300",
    BF: "bg-cyan-400/10 border-cyan-400/20 text-cyan-300",
    PF: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    LM: "bg-rose-400/10 border-rose-400/20 text-rose-300",
    DC: "bg-pink-400/10 border-pink-400/20 text-pink-300",
    TF: "bg-slate-400/10 border-slate-400/20 text-slate-400",
    SL: "bg-indigo-400/10 border-indigo-400/20 text-indigo-300",
    NC: "bg-rose-400/10 border-rose-400/20 text-rose-300",
    AF: "bg-orange-400/10 border-orange-400/20 text-orange-300",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Clientes",   value: String(CLIENTES.length),          sub: `${totalAtivos} ativos`,                    icon: Users,        stripe: "from-blue-400/60 to-blue-700/20",    iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]",    iconTxt: "text-blue-300",    glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]" },
          { label: "Faturamento 12m",     value: fmtK(faturamentoTotal),           sub: "Receita gerada pelos clientes",            icon: TrendingUp,   stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
          { label: "Títulos em Aberto",   value: String(titulosAbertos),           sub: "Recebimentos pendentes",                   icon: Clock,        stripe: "from-amber-400/60 to-amber-700/20",  iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",  iconTxt: "text-amber-300",   glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
          { label: "Inadimplentes",       value: String(totalInadimplentes),       sub: `${((totalInadimplentes/CLIENTES.length)*100).toFixed(0)}% da carteira`, icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
        ].map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* Filtros */}
      <FilterBar search={search} onSearch={setSearch}>
        <div className="h-4 w-px bg-[var(--sgt-divider)]" />
        <select
          value={filtroSegmento}
          onChange={e => setFiltroSegmento(e.target.value)}
          className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none"
        >
          <option value="todos">Todos os segmentos</option>
          {segmentos.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none"
        >
          <option value="todos">Status: Todos</option>
          <option value="Ativo">Ativo</option>
          <option value="Inadimplente">Inadimplente</option>
          <option value="Inativo">Inativo</option>
        </select>
        <span className="text-[11px] text-slate-600 ml-1">{filtered.length} clientes</span>
      </FilterBar>

      {/* Grade de cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((c, i) => {
          const avCls = avCor[c.avatar] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400";
          const segCls = segCor[c.segmento] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400";
          return (
            <AnimatedCard key={c.id} delay={i * 50}>
              <div className={`group flex flex-col gap-3 rounded-[14px] border bg-[var(--sgt-bg-card)] p-4 cursor-pointer transition-all ${
              c.inadimplente
                ? "border-rose-400/35 hover:border-rose-400/60"
                : "border-[var(--sgt-border-subtle)] hover:border-[var(--sgt-border-medium)]"
            }`}>

                {/* Header: avatar + nome + status */}
                <div className="flex items-start gap-2.5">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-semibold text-[11px] ${avCls}`}>
                    {c.avatar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-200 leading-tight truncate">{c.nome}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">{c.cnpj}</p>
                  </div>
                  <StatusBadge s={c.status} />
                </div>

                {/* Segmento */}
                <span className={`self-start rounded-md border px-2 py-0.5 text-[10px] font-medium ${segCls}`}>
                  {c.segmento}
                </span>

                {/* Localidade + contato */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <MapPin className="h-3 w-3 shrink-0" />{c.cidade}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <Users className="h-3 w-3 shrink-0" />{c.contato}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Fat. 12m",     value: fmtK(c.faturamento12m), clr: "text-emerald-300" },
                    { label: "Em aberto",    value: String(c.titulosAbertos), clr: c.titulosAbertos > 1 ? "text-rose-300" : c.titulosAbertos === 1 ? "text-amber-300" : "text-slate-400" },
                    { label: c.inadimplente ? "Dias em atraso" : "Prazo médio",  value: c.inadimplente ? `+${agingDias("2025-05-13")}d` : `${c.prazoMedio}d`,     clr: c.inadimplente ? "text-rose-300" : "text-slate-300" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-[var(--sgt-table-head)] px-1.5 py-1.5">
                      <p className="text-[9px] text-slate-600 leading-none mb-1">{s.label}</p>
                      <p className={`text-[11px] font-semibold leading-none ${s.clr}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Ações */}
                <div className="flex gap-1.5 pt-0.5">
                  <button title="Ver títulos" className="flex items-center gap-1 rounded-md border border-[var(--sgt-border-subtle)] bg-transparent px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:border-[var(--sgt-border-medium)] transition-colors">
                    <Eye className="h-3 w-3" /> Títulos
                  </button>
                  <button title="Enviar cobrança" className="flex items-center gap-1 rounded-md border border-[var(--sgt-border-subtle)] bg-transparent px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:border-[var(--sgt-border-medium)] transition-colors">
                    <Send className="h-3 w-3" /> Cobrar
                  </button>
                  <button title="Editar" className="ml-auto flex h-6 w-6 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300 transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-[13px]">Nenhum cliente encontrado</p>
        </div>
      )}
    </div>
  );
}

function ScreenCategorias() {
  const despesas = CATEGORIAS.filter(c => c.tipo === "Despesa");
  const receitas = CATEGORIAS.filter(c => c.tipo === "Receita");
  const totalDesp = despesas.reduce((s, c) => s + c.valor, 0);
  const totalRec = receitas.reduce((s, c) => s + c.valor, 0);
  const total = totalDesp + totalRec;

  const barCor: Record<string, string> = {
    amber: "bg-amber-400", blue: "bg-blue-400", violet: "bg-violet-400",
    teal: "bg-teal-400", rose: "bg-rose-400", emerald: "bg-emerald-400", cyan: "bg-cyan-400",
  };
  const icoCor: Record<string, string> = {
    amber: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    blue: "bg-blue-400/10 border-blue-400/20 text-blue-300",
    violet: "bg-violet-400/10 border-violet-400/20 text-violet-300",
    teal: "bg-teal-400/10 border-teal-400/20 text-teal-300",
    rose: "bg-rose-400/10 border-rose-400/20 text-rose-300",
    emerald: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    cyan: "bg-cyan-400/10 border-cyan-400/20 text-cyan-300",
  };
  const hexCor: Record<string, string> = {
    amber: "#fbbf24", blue: "#60a5fa", violet: "#a78bfa",
    teal: "#2dd4bf", rose: "#fb7185", emerald: "#34d399", cyan: "#22d3ee",
  };

  const donutData = [
    { name: "Despesas", value: totalDesp, fill: "#fb7185" },
    { name: "Receitas", value: totalRec,  fill: "#34d399" },
  ];

  const CustomDonutLabel = ({ cx, cy }: any) => (
    <>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e2e8f0" fontSize={18} fontWeight={700}>{((totalRec - totalDesp) / totalRec * 100).toFixed(0)}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={10}>margem</text>
    </>
  );

  function CatList({ cats }: { cats: typeof CATEGORIAS }) {
    return (
      <div className="flex flex-col gap-2">
        {cats.map((c, i) => {
          const Icon = c.icon;
          return (
            <AnimatedCard key={c.id} delay={i * 60}>
              <div className="flex items-center gap-3 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-4 py-3 hover:border-[var(--sgt-border-medium)] transition-all">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${icoCor[c.cor]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200">{c.nome}</p>
                  <p className="text-[10px] text-slate-600">{c.qtd} lançamentos · {c.fornecedores} {c.tipo === "Despesa" ? "fornecedores" : "clientes"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--sgt-progress-track)] overflow-hidden">
                      <div className={`h-1.5 rounded-full ${barCor[c.cor]}`} style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: hexCor[c.cor] }}>{c.pct}%</span>
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-white tabular-nums text-right shrink-0">{fmtK(c.valor)}</p>
                {/* Kebab menu — ações colapsadas */}
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
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Donut + totais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AnimatedCard>
          <SectionCard>
            <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300">Composição do mês</span>
            </div>
            <div className="flex items-center justify-center py-2" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="value" labelLine={false} label={<CustomDonutLabel />}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.85} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtK(v)} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 pb-3">
              <span className="flex items-center gap-1.5 text-[10px] text-rose-300"><span className="h-2 w-2 rounded-full bg-rose-400" />Despesas {((totalDesp/total)*100).toFixed(0)}%</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />Receitas {((totalRec/total)*100).toFixed(0)}%</span>
            </div>
          </SectionCard>
        </AnimatedCard>

        <AnimatedCard delay={60}>
          <div className="rounded-[12px] border border-rose-400/20 bg-rose-400/[0.04] px-4 py-4 h-full flex flex-col justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-rose-400/70">Total Despesas</p>
            <div>
              <p className="text-[26px] font-black text-rose-300 mt-2">{fmtK(totalDesp)}</p>
              <p className="text-[11px] text-slate-600 mt-1">no mês · {despesas.length} categorias</p>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-rose-400/10 overflow-hidden">
              <div className="h-1.5 rounded-full bg-rose-400/60" style={{ width: `${(totalDesp/total*100).toFixed(0)}%` }} />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={120}>
          <div className="rounded-[12px] border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-4 h-full flex flex-col justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400/70">Total Receitas</p>
            <div>
              <p className="text-[26px] font-black text-emerald-300 mt-2">{fmtK(totalRec)}</p>
              <p className="text-[11px] text-slate-600 mt-1">no mês · {receitas.length} categorias</p>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-emerald-400/10 overflow-hidden">
              <div className="h-1.5 rounded-full bg-emerald-400/60" style={{ width: `${(totalRec/total*100).toFixed(0)}%` }} />
            </div>
          </div>
        </AnimatedCard>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Despesas</p>
      <CatList cats={despesas} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Receitas</p>
      <CatList cats={receitas} />
    </div>
  );
}


// ─── TELA PREVISTO ────────────────────────────────────────────────────────────
function ScreenPrevisto() {
  const { contasPagar, contasReceber, isFetchingDw } = useFinancialData();
  const [horizonte, setHorizonte] = useState<30 | 60 | 90>(30);
  const saldoAtual = BANCOS.reduce((s, b) => s + b.saldo, 0);

  // Eventos futuros = títulos pendentes de CP e CR
  const eventosPrevistos = useMemo(() => [
    ...contasPagar.filter(c => dsPagar(c) === "Pendente" || dsPagar(c) === "Vence Hoje")
        .map(c => ({ data: c.vencimento, valor: -c.valor, tipo: "Saída" as const, desc: c.fornecedor, doc: c.documento ?? "" })),
    ...contasReceber.filter(c => dsReceber(c) === "Pendente" || dsReceber(c) === "Vence Hoje")
        .map(c => ({ data: c.vencimento, valor: c.valor, tipo: "Entrada" as const, desc: c.cliente, doc: c.documento ?? "" })),
  ].sort((a,b) => a.data.localeCompare(b.data)), [contasPagar, contasReceber]);

  const projecao = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limit = new Date(hoje); limit.setDate(limit.getDate() + horizonte);
    const dias: { dia: string; entradas: number; saidas: number; saldo: number }[] = [];
    let saldo = saldoAtual;
    const cur = new Date(hoje);
    while (cur <= limit) {
      const key  = cur.toISOString().slice(0,10);
      const label = cur.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
      const entradas = eventosPrevistos.filter(e => e.data === key && e.tipo === "Entrada").reduce((s,e) => s+e.valor,0);
      const saidas   = eventosPrevistos.filter(e => e.data === key && e.tipo === "Saída"  ).reduce((s,e) => s+Math.abs(e.valor),0);
      saldo += entradas - saidas;
      if (entradas > 0 || saidas > 0 || dias.length % 5 === 0) dias.push({ dia: label, entradas, saidas, saldo });
      cur.setDate(cur.getDate()+1);
    }
    return dias;
  }, [horizonte, eventosPrevistos, saldoAtual]);

  const totalEntradas = eventosPrevistos.filter(e => e.tipo === "Entrada").reduce((s,e) => s+e.valor,0);
  const totalSaidas   = eventosPrevistos.filter(e => e.tipo === "Saída"  ).reduce((s,e) => s+Math.abs(e.valor),0);
  const saldoFinal    = saldoAtual + totalEntradas - totalSaidas;
  const diasCriticos  = projecao.filter(d => d.saldo < 100000).length;

  const kpis = [
    { label: "Saldo Atual",       value: fmtK(saldoAtual),    sub: "4 contas bancárias",    icon: Landmark,     stripe: "from-cyan-400/60 to-cyan-700/20",    iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]"   },
    { label: "Entradas Previstas", value: fmtK(totalEntradas), sub: `${eventosPrevistos.filter(e=>e.tipo==="Entrada").length} títulos a receber`, icon: TrendingUp, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
    { label: "Saídas Previstas",   value: fmtK(totalSaidas),   sub: `${eventosPrevistos.filter(e=>e.tipo==="Saída").length} títulos a pagar`,    icon: TrendingDown, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
    { label: "Saldo Projetado",    value: fmtK(saldoFinal),    sub: saldoFinal >= saldoAtual ? "↑ Posição favorável" : "↓ Posição desfavorável", icon: BarChart3, stripe: saldoFinal >= saldoAtual ? "from-amber-400/60 to-amber-700/20" : "from-rose-400/60 to-rose-700/20", iconBg: saldoFinal >= saldoAtual ? "bg-amber-400/[0.08] border border-amber-400/[0.15]" : "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: saldoFinal >= saldoAtual ? "text-amber-300" : "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
  ];

  const SaldoTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-3 py-2 shadow-xl">
        <p className="text-[10px] font-semibold text-slate-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-[11px] font-semibold" style={{ color: p.color }}>
            {p.name === "saldo" ? "Saldo" : p.name === "entradas" ? "Entradas" : "Saídas"}: {fmtK(p.value)}
          </p>
        ))}
      </div>
    );
  };

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
              {diasCriticos} dia{diasCriticos>1?"s":""} com saldo projetado abaixo de R$ 100k no horizonte selecionado
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
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${horizonte===h?"bg-amber-500/20 border border-amber-500/30 text-amber-300":"border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>{h}d</button>
              ))}
            </div>
          </div>
          <div className="px-2 py-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projecao} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} width={36} />
                <Tooltip content={<SaldoTooltip />} />
                <Line type="monotone" dataKey={() => 100000} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} name="limite" legendType="none" />
                <Area type="monotone" dataKey="saldo" stroke="#22d3ee" strokeWidth={2} fill="url(#gradSaldo)" dot={false} name="saldo" />
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
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v:number) => `${(v/1000).toFixed(0)}k`} width={30} />
                  <Tooltip formatter={(v:any,n:string) => [fmtK(v), n==="entradas"?"Entradas":"Saídas"]} contentStyle={{ background: "var(--sgt-bg-card)", border: "0.5px solid var(--sgt-border-subtle)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
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
              {eventosPrevistos.slice(0,12).map((e,i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${e.tipo==="Entrada"?"bg-emerald-400":"bg-rose-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-300 truncate">{e.desc}</p>
                    <p className="text-[10px] text-slate-600">{fmtDate(e.data)} · {e.doc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[12px] font-semibold tabular-nums ${e.tipo==="Entrada"?"text-emerald-300":"text-rose-300"}`}>{e.tipo==="Entrada"?"+":"-"}{fmtK(Math.abs(e.valor))}</p>
                    <span className={`text-[9px] font-semibold ${e.tipo==="Entrada"?"text-emerald-600":"text-rose-600"}`}>{e.tipo}</span>
                  </div>
                </div>
              ))}
              {eventosPrevistos.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-slate-600">Nenhum evento previsto no período</p>}
            </div>
          </SectionCard>
        </AnimatedCard>
      </div>
    </div>
  );
}

// ─── BANK LOGOS ───────────────────────────────────────────────────────────────
function BankLogo({ sigla, size = 40 }: { sigla: string; size?: number }) {
  const s = size;
  if (sigla === "BB") return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#FFD700" fillOpacity="0.12"/>
      <circle cx="20" cy="20" r="11" stroke="#FFD700" strokeWidth="2.2" fill="none"/>
      <circle cx="20" cy="20" r="6" stroke="#FFD700" strokeWidth="1.5" fill="none"/>
      <line x1="9" y1="20" x2="31" y2="20" stroke="#FFD700" strokeWidth="1.5"/>
    </svg>
  );
  if (sigla === "BV") return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#CC092F" fillOpacity="0.12"/>
      <rect x="8" y="13" width="24" height="3.5" rx="1.75" fill="#CC092F" fillOpacity="0.85"/>
      <rect x="8" y="19.5" width="16" height="3.5" rx="1.75" fill="#CC092F" fillOpacity="0.85"/>
      <rect x="8" y="26" width="24" height="3.5" rx="1.75" fill="#CC092F" fillOpacity="0.85"/>
    </svg>
  );
  if (sigla === "IT") return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#EC7000" fillOpacity="0.12"/>
      <path d="M11 10 L20 30 L29 10" stroke="#EC7000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="20" cy="20" r="4.5" fill="#EC7000" fillOpacity="0.7"/>
    </svg>
  );
  if (sigla === "CA") return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#005CA9" fillOpacity="0.12"/>
      <rect x="8" y="17" width="24" height="14" rx="2.5" stroke="#005CA9" strokeOpacity="0.85" strokeWidth="2"/>
      <path d="M14 17 L14 13 Q14 9 20 9 Q26 9 26 13 L26 17" stroke="#005CA9" strokeOpacity="0.85" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="24" r="3" fill="#005CA9" fillOpacity="0.75"/>
    </svg>
  );
  return <span className="text-[13px] font-black text-slate-400">{sigla}</span>;
}

function ScreenBancos() {
  const [extratoBank, setExtratoBank] = useState("BB");
  const totalSaldo = BANCOS.reduce((s, b) => s + b.saldo, 0);

  const corMap: Record<string, { bg: string; text: string; border: string; valText: string }> = {
    amber:  { bg: "bg-amber-400/10",  text: "text-amber-300",  border: "border-amber-400/20",  valText: "text-amber-200"  },
    rose:   { bg: "bg-rose-400/10",   text: "text-rose-300",   border: "border-rose-400/20",   valText: "text-rose-200"   },
    violet: { bg: "bg-violet-400/10", text: "text-violet-300", border: "border-violet-400/20", valText: "text-violet-200" },
    teal:   { bg: "bg-teal-400/10",   text: "text-teal-300",   border: "border-teal-400/20",   valText: "text-teal-200"   },
  };
  const tipoMap: Record<string, string> = {
    Principal: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    Movimento: "bg-blue-400/10 border-blue-400/20 text-blue-300",
    Investimento: "bg-violet-400/10 border-violet-400/20 text-violet-300",
  };

  const SaldoTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-2.5 py-1.5 shadow-xl">
        <p className="text-[10px] text-slate-400">{payload[0]?.payload?.dia}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-[10px] font-semibold" style={{ color: p.color }}>{p.name}: {fmtK(p.value)}</p>
        ))}
      </div>
    );
  };

  const bankColors: Record<string, string> = { BB: "#FFD700", BV: "#CC092F", IT: "#EC7000", CA: "#005CA9" };

  return (
    <div className="flex flex-col gap-4">
      {/* Saldo consolidado + mini sparkline */}
      <AnimatedCard>
        <SectionCard>
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--sgt-divider)]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/70">Saldo Consolidado</p>
              <p className="text-[28px] font-black text-cyan-300 leading-none mt-1 tabular-nums">{fmtBRL(totalSaldo)}</p>
              <p className="text-[11px] text-slate-600 mt-1">{BANCOS.length} contas ativas · atualizado agora</p>
            </div>
            <div style={{ width: 200, height: 64 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SALDO_HISTORICO} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  {BANCOS.map(b => (
                    <Line key={b.sigla} type="monotone" dataKey={b.sigla} name={b.nome}
                      stroke={bankColors[b.sigla]} strokeWidth={1.5} dot={false} />
                  ))}
                  <Tooltip content={<SaldoTooltip />} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[var(--sgt-divider)]">
            {BANCOS.map(b => {
              const c = corMap[b.cor];
              return (
                <div key={b.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BankLogo sigla={b.sigla} size={18} />
                    <span className="text-[10px] text-slate-600 truncate">{b.nome}</span>
                  </div>
                  <p className={`text-[14px] font-black leading-none tabular-nums ${c.valText}`}>{fmtK(b.saldo)}</p>
                  <p className="text-[9px] text-slate-600 mt-1">{b.tipo}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </AnimatedCard>

      {/* Cards dos bancos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BANCOS.map((b, i) => {
          const c = corMap[b.cor];
          return (
            <AnimatedCard key={b.id} delay={i * 80}>
              <div className={`rounded-[14px] border bg-[var(--sgt-bg-card)] p-4 ${c.border}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${c.border}`}>
                    <BankLogo sigla={b.sigla} size={36} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-slate-200">{b.nome}</p>
                    <p className="text-[10px] text-slate-600">Ag. {b.agencia} · CC {b.conta}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tipoMap[b.tipo] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400"}`}>{b.tipo}</span>
                </div>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-600">Saldo disponível</p>
                  <p className={`text-[22px] font-black leading-none tabular-nums ${c.valText}`}>{fmtBRL(b.saldo)}</p>
                </div>
                <div className="flex flex-col gap-1 border-t border-[var(--sgt-divider)] pt-3">
                  {[
                    { label: "Entradas no mês",   value: `+${fmtK(b.entradas)}`,                        clr: "text-emerald-300" },
                    { label: "Saídas no mês",      value: b.saidas > 0 ? `-${fmtK(b.saidas)}` : "—",   clr: b.saidas > 0 ? "text-rose-300" : "text-slate-500" },
                    { label: "Títulos agendados",  value: b.agendado > 0 ? fmtK(b.agendado) : "—",     clr: b.agendado > 0 ? "text-amber-300" : "text-slate-500" },
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

      {/* Extrato com seletor de conta */}
      <AnimatedCard delay={380}>
        <SectionCard>
          {/* Tabs de conta */}
          <div className="flex items-center border-b border-[var(--sgt-divider)] px-4 pt-1 overflow-x-auto">
            {BANCOS.map(b => (
              <button key={b.sigla} onClick={() => setExtratoBank(b.sigla)}
                className={`flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                  extratoBank === b.sigla ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
                <BankLogo sigla={b.sigla} size={16} />
                {b.nome}
              </button>
            ))}
            <div className="ml-auto pb-2 flex gap-3 shrink-0">
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"><Plus className="h-3 w-3" />Lançamento manual</button>
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"><Download className="h-3 w-3" />Importar OFX</button>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-500">
              Últimos lançamentos · {BANCOS.find(b => b.sigla === extratoBank)?.nome}
            </span>
          </div>
          {EXTRATO.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
              <div className={`h-2 w-2 rounded-full shrink-0 ${e.tipo === "C" ? "bg-emerald-400" : "bg-rose-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-300">{e.desc}</p>
                <p className="text-[10px] text-slate-600">{e.meta}</p>
              </div>
              <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${e.valor > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {e.valor > 0 ? "+" : ""}{fmtBRL(e.valor)}
              </p>
            </div>
          ))}
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
              className={`flex-shrink-0 flex flex-col border-r transition-all duration-300 ${sidebarCollapsed ? "w-[52px]" : "w-[200px]"}`}
              style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-section)" }}
            >
              <div className="flex flex-col flex-1 overflow-y-auto py-2">
                {NAV.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  const showSection = item.section && (i === 0 || NAV[i - 1].section !== item.section);
                  return (
                    <div key={item.id}>
                      {showSection && !sidebarCollapsed && (
                        <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600">{item.section}</p>
                      )}
                      <button
                        onClick={() => {
                          if (item.externalTo) { navigate(item.externalTo); return; }
                          setActive(item.id);
                        }}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 rounded-lg mx-1 ${sidebarCollapsed ? "justify-center" : ""} ${
                          item.externalTo
                            ? "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300"
                            : isActive
                              ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/25"
                              : "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300"
                        }`}
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.externalTo && <ExternalLink className="h-3 w-3 shrink-0 text-slate-600" />}
                            {item.badge && !item.externalTo && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                (item as any).badgeColor === "amber"
                                  ? "bg-amber-400/15 text-amber-300"
                                  : "bg-rose-400/15 text-rose-300"
                              }`}>{item.badge}</span>
                            )}
                          </>
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
