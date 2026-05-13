import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  FileBarChart, Building2, Tag, Landmark,
  TrendingDown, TrendingUp, Clock, CheckCircle,
  AlertTriangle, DollarSign, Wallet, BarChart3,
  Search, ChevronRight, ChevronLeft, Eye, Pencil,
  Banknote, Send, Download, Plus, FileSpreadsheet,
  ArrowRightLeft, Zap, Package, Bolt, Users,
  Truck, Flame, Wrench, Filter, ChevronDown,
  MapPin, Phone, Star, Mail,
} from "lucide-react";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import sgtLogo from "@/assets/sgt-logo.png";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}k` : fmtBRL(v);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const PAGAR = [
  { id: 1, fornecedor: "Petrobras Distribuidora", cnpj: "33.453.178/0001-00", documento: "NF-004821", emissao: "2025-04-08", vencimento: "2025-05-02", valor: 14320, tipo: "NF", status: "Vencido" },
  { id: 2, fornecedor: "Brasken S.A.", cnpj: "42.150.391/0001-70", documento: "BOL-009134", emissao: "2025-04-10", vencimento: "2025-05-13", valor: 12340, tipo: "Boleto", status: "Vence Hoje" },
  { id: 3, fornecedor: "Correios & Logística", cnpj: "34.028.316/0001-03", documento: "NF-021788", emissao: "2025-04-15", vencimento: "2025-05-20", valor: 7850, tipo: "NF", status: "Pendente" },
  { id: 4, fornecedor: "SASCAR Tecnologia", cnpj: "01.838.723/0001-27", documento: "CTR-003312", emissao: "2025-05-01", vencimento: "2025-06-01", valor: 4200, tipo: "Contrato", status: "Agendado" },
  { id: 5, fornecedor: "Omnilink S.A.", cnpj: "07.175.725/0001-84", documento: "NF-018940", emissao: "2025-04-03", vencimento: "2025-04-25", valor: 9180, tipo: "NF", status: "Vencido" },
  { id: 6, fornecedor: "Projeção Transportes", cnpj: "18.432.007/0001-55", documento: "NF-031204", emissao: "2025-04-20", vencimento: "2025-05-28", valor: 21600, tipo: "NF", status: "Pendente" },
  { id: 7, fornecedor: "Eletropaulo S.A.", cnpj: "61.695.227/0001-93", documento: "BOL-104412", emissao: "2025-05-05", vencimento: "2025-05-15", valor: 3290, tipo: "Boleto", status: "Pendente" },
  { id: 8, fornecedor: "Petrobras Distribuidora", cnpj: "33.453.178/0001-00", documento: "NF-004933", emissao: "2025-04-25", vencimento: "2025-05-25", valor: 16800, tipo: "NF", status: "Pendente" },
  { id: 9, fornecedor: "Brasken S.A.", cnpj: "42.150.391/0001-70", documento: "BOL-009201", emissao: "2025-04-30", vencimento: "2025-06-10", valor: 8900, tipo: "Boleto", status: "Agendado" },
  { id: 10, fornecedor: "Correios & Logística", cnpj: "34.028.316/0001-03", documento: "NF-022001", emissao: "2025-04-12", vencimento: "2025-04-20", valor: 5400, tipo: "NF", status: "Pago" },
];

const RECEBER = [
  { id: 1, cliente: "Transpolog Ltda", cnpj: "09.241.885/0001-12", documento: "NF-008812", emissao: "2025-04-02", vencimento: "2025-04-28", valor: 28400, tipo: "NF", status: "Em Atraso" },
  { id: 2, cliente: "Veloz Express", cnpj: "17.332.091/0001-48", documento: "DUP-004422", emissao: "2025-04-10", vencimento: "2025-05-13", valor: 15700, tipo: "Duplicata", status: "Vence Hoje" },
  { id: 3, cliente: "Cargo Rápido", cnpj: "22.018.443/0001-90", documento: "NF-019933", emissao: "2025-04-18", vencimento: "2025-05-22", valor: 9300, tipo: "NF", status: "Pendente" },
  { id: 4, cliente: "RodoLog S.A.", cnpj: "31.029.774/0001-66", documento: "BOL-041200", emissao: "2025-05-05", vencimento: "2025-05-30", valor: 42000, tipo: "Boleto", status: "Pendente" },
  { id: 5, cliente: "Brilho Frete", cnpj: "48.332.110/0001-22", documento: "NF-022101", emissao: "2025-04-28", vencimento: "2025-05-28", valor: 18500, tipo: "NF", status: "Recebido" },
  { id: 6, cliente: "Paraíso Frotas", cnpj: "55.817.009/0001-37", documento: "DUP-009811", emissao: "2025-05-01", vencimento: "2025-05-31", valor: 33200, tipo: "Duplicata", status: "Agendado" },
  { id: 7, cliente: "LogMax Transportes", cnpj: "62.114.882/0001-55", documento: "NF-033100", emissao: "2025-04-05", vencimento: "2025-04-18", valor: 11200, tipo: "NF", status: "Em Atraso" },
  { id: 8, cliente: "Transpolog Ltda", cnpj: "09.241.885/0001-12", documento: "NF-009001", emissao: "2025-05-01", vencimento: "2025-06-01", valor: 31000, tipo: "NF", status: "Pendente" },
];

const FORNECEDORES = [
  { id: 1, nome: "Petrobras Distribuidora", cnpj: "33.453.178/0001-00", categoria: "Combustível", status: "Ativo", volume12m: 198000, titulos: 3, prazo: 30, avatar: "PE" },
  { id: 2, nome: "Correios & Logística", cnpj: "34.028.316/0001-03", categoria: "Logística", status: "Ativo", volume12m: 84000, titulos: 1, prazo: 28, avatar: "CO" },
  { id: 3, nome: "SASCAR Tecnologia", cnpj: "01.838.723/0001-27", categoria: "Rastreamento", status: "Ativo", volume12m: 50000, titulos: 1, prazo: 30, avatar: "SC" },
  { id: 4, nome: "Brasken S.A.", cnpj: "42.150.391/0001-70", categoria: "Materiais", status: "Ativo", volume12m: 142000, titulos: 2, prazo: 45, avatar: "BR" },
  { id: 5, nome: "Omnilink S.A.", cnpj: "07.175.725/0001-84", categoria: "Rastreamento", status: "Bloqueado", volume12m: 61000, titulos: 4, prazo: 30, avatar: "OM" },
  { id: 6, nome: "Eletropaulo S.A.", cnpj: "61.695.227/0001-93", categoria: "Utilidades", status: "Ativo", volume12m: 39000, titulos: 1, prazo: 15, avatar: "EL" },
  { id: 7, nome: "Projeção Transportes", cnpj: "18.432.007/0001-55", categoria: "Logística", status: "Ativo", volume12m: 95000, titulos: 2, prazo: 30, avatar: "PR" },
  { id: 8, nome: "MegaFlex Ind.", cnpj: "29.118.542/0001-09", categoria: "Insumos", status: "Inativo", volume12m: 22000, titulos: 0, prazo: 60, avatar: "MF" },
];

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
  if (s === "Vencido" || s === "Em Atraso") return { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-400/10 border-rose-400/20" };
  if (s === "Vence Hoje") return { dot: "bg-blue-400", text: "text-blue-300", bg: "bg-blue-400/10 border-blue-400/20" };
  if (s === "Pendente") return { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/20" };
  if (s === "Agendado") return { dot: "bg-violet-400", text: "text-violet-300", bg: "bg-violet-400/10 border-violet-400/20" };
  if (s === "Pago" || s === "Recebido") return { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" };
  if (s === "Ativo") return { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" };
  if (s === "Bloqueado") return { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-400/10 border-rose-400/20" };
  if (s === "Inativo") return { dot: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" };
  if (s === "Conciliado") return { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" };
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

function ScreenPainel() {
  const totalPagar = PAGAR.filter(p => p.status !== "Pago").reduce((s, p) => s + p.valor, 0);
  const totalReceber = RECEBER.filter(r => r.status !== "Recebido").reduce((s, r) => s + r.valor, 0);
  const vencidosPagar = PAGAR.filter(p => p.status === "Vencido").reduce((s, p) => s + p.valor, 0);
  const atrasadosReceber = RECEBER.filter(r => r.status === "Em Atraso").reduce((s, r) => s + r.valor, 0);
  const saldo = totalReceber - totalPagar;
  const saldoBancos = BANCOS.reduce((s, b) => s + b.saldo, 0);

  const kpis = [
    { label: "Saldo em Bancos", value: fmtK(saldoBancos), sub: `${BANCOS.length} contas ativas`, icon: Landmark, stripe: "from-cyan-400/60 to-cyan-700/20", iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]", iconTxt: "text-cyan-300", glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]" },
    { label: "A Pagar (abertas)", value: fmtK(totalPagar), sub: `${PAGAR.filter(p => p.status !== "Pago").length} títulos`, icon: TrendingDown, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
    { label: "A Receber (abertas)", value: fmtK(totalReceber), sub: `${RECEBER.filter(r => r.status !== "Recebido").length} títulos`, icon: TrendingUp, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
    { label: "Resultado Líquido", value: fmtK(Math.abs(saldo)), sub: saldo >= 0 ? "Posição favorável" : "Posição desfavorável", icon: BarChart3, stripe: "from-amber-400/60 to-amber-700/20", iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]", iconTxt: "text-amber-300", glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* Alertas rápidos */}
      {(vencidosPagar > 0 || atrasadosReceber > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vencidosPagar > 0 && (
            <AnimatedCard delay={250}>
              <div className="flex items-start gap-3 rounded-[12px] border border-rose-400/20 bg-rose-400/[0.06] p-3.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-rose-300">Títulos vencidos a pagar</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{PAGAR.filter(p => p.status === "Vencido").length} títulos · {fmtBRL(vencidosPagar)} em atraso</p>
                </div>
              </div>
            </AnimatedCard>
          )}
          {atrasadosReceber > 0 && (
            <AnimatedCard delay={300}>
              <div className="flex items-start gap-3 rounded-[12px] border border-amber-400/20 bg-amber-400/[0.06] p-3.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-amber-300">Clientes em atraso</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{RECEBER.filter(r => r.status === "Em Atraso").length} clientes · {fmtBRL(atrasadosReceber)} inadimplentes</p>
                </div>
              </div>
            </AnimatedCard>
          )}
        </div>
      )}

      {/* Resumos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pagar */}
        <AnimatedCard delay={350}>
          <SectionCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><ArrowDownCircle className="h-3.5 w-3.5 text-rose-400" />Próximos vencimentos a pagar</span>
            </div>
            {PAGAR.filter(p => p.status !== "Pago").slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                <Avatar initials={p.fornecedor.slice(0, 2).toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-300 truncate">{p.fornecedor}</p>
                  <p className="text-[10px] text-slate-600">{fmtDate(p.vencimento)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold text-white">{fmtK(p.valor)}</p>
                  <StatusBadge s={p.status} />
                </div>
              </div>
            ))}
          </SectionCard>
        </AnimatedCard>

        {/* Top Receber */}
        <AnimatedCard delay={400}>
          <SectionCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
              <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />Próximos recebimentos</span>
            </div>
            {RECEBER.filter(r => r.status !== "Recebido").slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0 hover:bg-[var(--sgt-row-hover)] transition-colors">
                <Avatar initials={r.cliente.slice(0, 2).toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-300 truncate">{r.cliente}</p>
                  <p className="text-[10px] text-slate-600">{fmtDate(r.vencimento)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold text-white">{fmtK(r.valor)}</p>
                  <StatusBadge s={r.status} />
                </div>
              </div>
            ))}
          </SectionCard>
        </AnimatedCard>
      </div>

      {/* Bancos resumo */}
      <AnimatedCard delay={450}>
        <SectionCard>
          <div className="px-4 py-3 border-b border-[var(--sgt-divider)]">
            <span className="text-[12px] font-semibold text-slate-300 flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-cyan-400" />Posição bancária</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[var(--sgt-divider)]">
            {BANCOS.map(b => {
              const colMap: Record<string, string> = { amber: "text-amber-300", rose: "text-rose-300", violet: "text-violet-300", teal: "text-teal-300" };
              return (
                <div key={b.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BankLogo sigla={b.sigla} size={20} />
                    <span className="text-[10px] text-slate-600 truncate">{b.nome}</span>
                  </div>
                  <p className="text-[15px] font-black text-white leading-none">{fmtK(b.saldo)}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{b.tipo}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}

function ScreenPagar() {
  const [search, setSearch] = useState("");
  const [filtroAba, setFiltroAba] = useState("todos");
  const [page, setPage] = useState(1);
  const PAGE = 30;

  const totalPagar = PAGAR.filter(p => p.status !== "Pago").reduce((s, p) => s + p.valor, 0);
  const vencido = PAGAR.filter(p => p.status === "Vencido").reduce((s, p) => s + p.valor, 0);
  const hoje = PAGAR.filter(p => p.status === "Vence Hoje").reduce((s, p) => s + p.valor, 0);
  const pago = PAGAR.filter(p => p.status === "Pago").reduce((s, p) => s + p.valor, 0);

  const ABAS_PAGAR = [
    { id: "todos",      label: "Todos",      count: PAGAR.length },
    { id: "Vencido",    label: "Vencidos",   count: PAGAR.filter(p => p.status === "Vencido").length },
    { id: "Vence Hoje", label: "Vence Hoje", count: PAGAR.filter(p => p.status === "Vence Hoje").length },
    { id: "a-vencer",   label: "A Vencer",   count: PAGAR.filter(p => ["Pendente","Agendado"].includes(p.status)).length },
    { id: "Pago",       label: "Pagos",      count: PAGAR.filter(p => p.status === "Pago").length },
  ];

  const filtered = useMemo(() => PAGAR.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.fornecedor.toLowerCase().includes(q) || p.documento.toLowerCase().includes(q);
    let matchAba = true;
    if (filtroAba === "a-vencer") matchAba = ["Pendente","Agendado"].includes(p.status);
    else if (filtroAba !== "todos") matchAba = p.status === filtroAba;
    return matchQ && matchAba;
  }), [search, filtroAba]);

  const paginated = filtered.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const kpis = [
    { label: "Total a Pagar", value: fmtK(totalPagar), sub: `${PAGAR.filter(p => p.status !== "Pago").length} títulos em aberto`, icon: Wallet, stripe: "from-blue-400/60 to-blue-700/20", iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]", iconTxt: "text-blue-300", glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]" },
    { label: "Vencido", value: fmtK(vencido), sub: `${PAGAR.filter(p => p.status === "Vencido").length} títulos em atraso`, icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
    { label: "Vence Hoje", value: fmtK(hoje), sub: `${PAGAR.filter(p => p.status === "Vence Hoje").length} títulos para hoje`, icon: Clock, stripe: "from-amber-400/60 to-amber-700/20", iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]", iconTxt: "text-amber-300", glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
    { label: "Pago no Mês", value: fmtK(pago), sub: `${PAGAR.filter(p => p.status === "Pago").length} títulos quitados`, icon: CheckCircle, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      <FilterBar search={search} onSearch={v => { setSearch(v); setPage(1); }} />

      <AnimatedCard delay={200}>
        <SectionCard>
          {/* Abas */}
          <div className="flex items-center gap-0 px-4 pt-3 border-b border-[var(--sgt-divider)] overflow-x-auto">
            {ABAS_PAGAR.map(a => (
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
                <Th>Fornecedor</Th><Th>Documento</Th><Th>Emissão</Th><Th>Vencimento</Th><Th>Valor</Th><Th>Tipo</Th><Th>Status</Th><Th>Ações</Th>
              </tr></thead>
              <tbody>
                {paginated.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--sgt-row-hover)] transition-colors">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={p.fornecedor.slice(0, 2).toUpperCase()} />
                        <div>
                          <p className="font-medium text-slate-200 text-[12px]">{p.fornecedor}</p>
                          <p className="text-[10px] text-slate-600">{p.cnpj}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-[11px] text-slate-500">{p.documento}</Td>
                    <Td className="text-slate-500">{fmtDate(p.emissao)}</Td>
                    <Td className={p.status === "Vencido" || p.status === "Vence Hoje" ? "font-semibold text-rose-300" : "text-slate-400"}>{fmtDate(p.vencimento)}</Td>
                    <Td className={`font-semibold tabular-nums ${p.status === "Vencido" ? "text-rose-300" : p.status === "Vence Hoje" ? "text-blue-300" : "text-white"}`}>{fmtBRL(p.valor)}</Td>
                    <Td className="text-slate-500 text-[11px]">{p.tipo}</Td>
                    <Td><StatusBadge s={p.status} /></Td>
                    <Td>
                      <div className="flex gap-1">
                        <ActionBtn icon={Banknote} title="Registrar pagamento" />
                        <ActionBtn icon={Pencil} title="Editar" />
                        <ActionBtn icon={Eye} title="Detalhes" />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-600">{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} className={`h-7 w-7 rounded-md text-[11px] font-medium transition-colors ${n === page ? "bg-amber-500/20 border border-amber-500/40 text-amber-300" : "border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </SectionCard>
      </AnimatedCard>
    </div>
  );
}

function ScreenReceber() {
  const [search, setSearch] = useState("");
  const [filtroAba, setFiltroAba] = useState("todos");
  const [page, setPage] = useState(1);
  const PAGE = 30;

  const totalReceber = RECEBER.filter(r => r.status !== "Recebido").reduce((s, r) => s + r.valor, 0);
  const emAtraso = RECEBER.filter(r => r.status === "Em Atraso").reduce((s, r) => s + r.valor, 0);
  const previsto = RECEBER.filter(r => ["Pendente", "Vence Hoje"].includes(r.status)).reduce((s, r) => s + r.valor, 0);
  const recebido = RECEBER.filter(r => r.status === "Recebido").reduce((s, r) => s + r.valor, 0);

  const ABAS_RECEBER = [
    { id: "todos",      label: "Todos",       count: RECEBER.length },
    { id: "Em Atraso",  label: "Em Atraso",   count: RECEBER.filter(r => r.status === "Em Atraso").length },
    { id: "Vence Hoje", label: "Vence Hoje",  count: RECEBER.filter(r => r.status === "Vence Hoje").length },
    { id: "a-vencer",   label: "A Vencer",    count: RECEBER.filter(r => ["Pendente","Agendado"].includes(r.status)).length },
    { id: "Recebido",   label: "Recebidos",   count: RECEBER.filter(r => r.status === "Recebido").length },
  ];

  const filtered = useMemo(() => RECEBER.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.cliente.toLowerCase().includes(q) || r.documento.toLowerCase().includes(q);
    let matchAba = true;
    if (filtroAba === "a-vencer") matchAba = ["Pendente","Agendado"].includes(r.status);
    else if (filtroAba !== "todos") matchAba = r.status === filtroAba;
    return matchQ && matchAba;
  }), [search, filtroAba]);

  const paginated = filtered.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const kpis = [
    { label: "Total a Receber", value: fmtK(totalReceber), sub: `${RECEBER.filter(r => r.status !== "Recebido").length} títulos em aberto`, icon: TrendingUp, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
    { label: "Em Atraso", value: fmtK(emAtraso), sub: `${RECEBER.filter(r => r.status === "Em Atraso").length} clientes inadimplentes`, icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
    { label: "Previsto no Mês", value: fmtK(previsto), sub: `${RECEBER.filter(r => ["Pendente", "Vence Hoje"].includes(r.status)).length} vencimentos`, icon: Clock, stripe: "from-blue-400/60 to-blue-700/20", iconBg: "bg-blue-400/[0.08] border border-blue-400/[0.15]", iconTxt: "text-blue-300", glow: "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]" },
    { label: "Recebido no Mês", value: fmtK(recebido), sub: `${RECEBER.filter(r => r.status === "Recebido").length} títulos liquidados`, icon: CheckCircle, stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 60} />)}
      </div>

      <FilterBar search={search} onSearch={v => { setSearch(v); setPage(1); }} />

      <AnimatedCard delay={200}>
        <SectionCard>
          {/* Abas */}
          <div className="flex items-center gap-0 px-4 pt-3 border-b border-[var(--sgt-divider)] overflow-x-auto">
            {ABAS_RECEBER.map(a => (
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
                <Th>Cliente</Th><Th>Documento</Th><Th>Emissão</Th><Th>Vencimento</Th><Th>Valor</Th><Th>Tipo</Th><Th>Status</Th><Th>Ações</Th>
              </tr></thead>
              <tbody>
                {paginated.map(r => (
                  <tr key={r.id} className="hover:bg-[var(--sgt-row-hover)] transition-colors">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={r.cliente.slice(0, 2).toUpperCase()} />
                        <div>
                          <p className="font-medium text-slate-200 text-[12px]">{r.cliente}</p>
                          <p className="text-[10px] text-slate-600">{r.cnpj}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-[11px] text-slate-500">{r.documento}</Td>
                    <Td className="text-slate-500">{fmtDate(r.emissao)}</Td>
                    <Td className={r.status === "Em Atraso" ? "font-semibold text-rose-300" : "text-slate-400"}>{fmtDate(r.vencimento)}</Td>
                    <Td className={`font-semibold tabular-nums ${r.status === "Em Atraso" ? "text-rose-300" : r.status === "Vence Hoje" ? "text-blue-300" : r.status === "Recebido" ? "text-emerald-300" : "text-white"}`}>{fmtBRL(r.valor)}</Td>
                    <Td className="text-slate-500 text-[11px]">{r.tipo}</Td>
                    <Td><StatusBadge s={r.status} /></Td>
                    <Td>
                      <div className="flex gap-1">
                        <ActionBtn icon={Send} title="Enviar cobrança" />
                        <ActionBtn icon={Pencil} title="Editar" />
                        <ActionBtn icon={Eye} title="Detalhes" />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--sgt-divider)]">
            <span className="text-[11px] text-slate-600">{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} className={`h-7 w-7 rounded-md text-[11px] font-medium transition-colors ${n === page ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" : "border border-[var(--sgt-border-subtle)] text-slate-500 hover:text-slate-300"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-500 disabled:opacity-30 hover:text-slate-300 transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
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
  const reports = [
    { name: "DRE Simplificado", desc: "Receitas, despesas e resultado por período. Exporta PDF e Excel.", tag: "Mensal", cor: "blue", icon: FileBarChart },
    { name: "Fluxo de Caixa", desc: "Entradas e saídas projetadas vs realizadas com saldo diário.", tag: "Diário", cor: "emerald", icon: BarChart3 },
    { name: "Análise por Categoria", desc: "Distribuição de gastos e receitas por categoria e centro de custo.", tag: "Analítico", cor: "amber", icon: Tag },
    { name: "Aging de Fornecedores", desc: "Títulos vencidos agrupados por faixa: 30, 60, 90, 90+ dias.", tag: "Gerencial", cor: "violet", icon: Building2 },
    { name: "Aging de Clientes", desc: "Inadimplência e concentração de recebíveis por cliente.", tag: "Gerencial", cor: "rose", icon: Users },
    { name: "Conciliação Bancária", desc: "Status detalhado de conciliações por conta e período.", tag: "Auditoria", cor: "teal", icon: RefreshCcw },
  ];

  const recentes = [
    { nome: "DRE Abril/2025", tipo: "PDF", gerado: "11/05/2025 14:22", periodo: "Abr/2025", tamanho: "248 KB" },
    { nome: "Fluxo de Caixa Mai/2025", tipo: "Excel", gerado: "10/05/2025 09:05", periodo: "Mai/2025", tamanho: "184 KB" },
    { nome: "Aging Fornecedores Q1", tipo: "PDF", gerado: "02/04/2025 11:40", periodo: "Jan–Mar/25", tamanho: "512 KB" },
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
      <div className="flex items-center gap-3 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-4 py-2.5">
        <span className="text-[11px] font-semibold text-slate-500">Período</span>
        <input type="text" defaultValue="01/01/2025" className="h-7 w-28 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 text-[11px] text-slate-300 outline-none" />
        <span className="text-[11px] text-slate-600">até</span>
        <input type="text" defaultValue="31/05/2025" className="h-7 w-28 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 text-[11px] text-slate-300 outline-none" />
        <button className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors">Gerar Relatório</button>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Disponíveis</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r, i) => {
          const Icon = r.icon;
          const c = corMap[r.cor];
          return (
            <AnimatedCard key={r.name} delay={i * 60}>
              <div className={`group flex flex-col gap-3 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 cursor-pointer hover:border-[var(--sgt-border-medium)] transition-all`}>
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
  const filtered = useMemo(() =>
    FORNECEDORES.filter(f => !search || f.nome.toLowerCase().includes(search.toLowerCase()) || f.cnpj.includes(search)),
    [search]
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterBar search={search} onSearch={setSearch}>
        <div className="h-4 w-px bg-[var(--sgt-divider)]" />
        <select className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none">
          <option>Todas as categorias</option>
          <option>Combustível</option>
          <option>Rastreamento</option>
          <option>Logística</option>
          <option>Utilidades</option>
        </select>
        <select className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none">
          <option>Status: Todos</option>
          <option>Ativo</option>
          <option>Bloqueado</option>
          <option>Inativo</option>
        </select>
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
              <div className="group flex flex-col gap-3 rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 cursor-pointer hover:border-[var(--sgt-border-medium)] transition-all">

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
                    { label: "Prazo médio",  value: `${c.prazoMedio}d`,     clr: "text-slate-300" },
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

  function CatList({ cats, total }: { cats: typeof CATEGORIAS; total: number }) {
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
                    <span className={`text-[10px] font-semibold ${icoCor[c.cor].split(" ").find(x => x.startsWith("text-")) ?? ""}`}>{c.pct}%</span>
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-white tabular-nums text-right shrink-0">{fmtK(c.valor)}</p>
                <div className="flex gap-1 shrink-0">
                  <ActionBtn icon={Pencil} title="Editar" />
                  <ActionBtn icon={Eye} title="Ver lançamentos" />
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
      <div className="grid grid-cols-2 gap-3">
        <AnimatedCard>
          <div className="rounded-[12px] border border-rose-400/20 bg-rose-400/[0.04] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-rose-400/70">Total Despesas</p>
            <p className="text-[22px] font-black text-rose-300 mt-1">{fmtK(totalDesp)}</p>
            <p className="text-[11px] text-slate-600">no mês · {despesas.length} categorias</p>
          </div>
        </AnimatedCard>
        <AnimatedCard delay={60}>
          <div className="rounded-[12px] border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400/70">Total Receitas</p>
            <p className="text-[22px] font-black text-emerald-300 mt-1">{fmtK(totalRec)}</p>
            <p className="text-[11px] text-slate-600">no mês · {receitas.length} categorias</p>
          </div>
        </AnimatedCard>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Despesas</p>
      </div>
      <CatList cats={despesas} total={totalDesp} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">Receitas</p>
      <CatList cats={receitas} total={totalRec} />
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
  const totalSaldo = BANCOS.reduce((s, b) => s + b.saldo, 0);
  const corMap: Record<string, { bg: string; text: string; border: string; valText: string }> = {
    amber: { bg: "bg-amber-400/10", text: "text-amber-300", border: "border-amber-400/20", valText: "text-amber-200" },
    rose: { bg: "bg-rose-400/10", text: "text-rose-300", border: "border-rose-400/20", valText: "text-rose-200" },
    violet: { bg: "bg-violet-400/10", text: "text-violet-300", border: "border-violet-400/20", valText: "text-violet-200" },
    teal: { bg: "bg-teal-400/10", text: "text-teal-300", border: "border-teal-400/20", valText: "text-teal-200" },
  };
  const tipoMap: Record<string, string> = { Principal: "bg-amber-400/10 border-amber-400/20 text-amber-300", Movimento: "bg-blue-400/10 border-blue-400/20 text-blue-300", Investimento: "bg-violet-400/10 border-violet-400/20 text-violet-300" };

  return (
    <div className="flex flex-col gap-4">
      {/* Total consolidado */}
      <AnimatedCard>
        <div className="rounded-[14px] border border-cyan-400/20 bg-cyan-400/[0.04] px-5 py-4 flex items-center gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/70">Saldo Consolidado</p>
            <p className="text-[28px] font-black text-cyan-300 leading-none mt-1">{fmtBRL(totalSaldo)}</p>
            <p className="text-[11px] text-slate-600 mt-1">{BANCOS.length} contas ativas · atualizado agora</p>
          </div>
        </div>
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
                    <BankLogo sigla={b.sigla} size={36} /></div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-slate-200">{b.nome}</p>
                    <p className="text-[10px] text-slate-600">Ag. {b.agencia} · CC {b.conta}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tipoMap[b.tipo] ?? "bg-slate-400/10 border-slate-400/20 text-slate-400"}`}>{b.tipo}</span>
                </div>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-600">Saldo disponível</p>
                  <p className={`text-[22px] font-black leading-none ${c.valText}`}>{fmtBRL(b.saldo)}</p>
                </div>
                <div className="flex flex-col gap-1 border-t border-[var(--sgt-divider)] pt-3">
                  {[
                    { label: "Entradas no mês", value: `+${fmtK(b.entradas)}`, clr: "text-emerald-300" },
                    { label: "Saídas no mês", value: b.saidas > 0 ? `-${fmtK(b.saidas)}` : "—", clr: b.saidas > 0 ? "text-rose-300" : "text-slate-500" },
                    { label: "Títulos agendados", value: b.agendado > 0 ? fmtK(b.agendado) : "—", clr: b.agendado > 0 ? "text-amber-300" : "text-slate-500" },
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

      {/* Extrato */}
      <AnimatedCard delay={350}>
        <SectionCard>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sgt-divider)]">
            <span className="text-[12px] font-semibold text-slate-300">Últimos lançamentos — Banco do Brasil</span>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"><Plus className="h-3 w-3" />Lançamento manual</button>
              <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"><Download className="h-3 w-3" />Importar OFX</button>
            </div>
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
type ScreenId = "painel" | "pagar" | "receber" | "conciliacao" | "relatorios" | "fornecedores" | "clientes" | "categorias" | "bancos";

const NAV: { id: ScreenId; label: string; icon: React.ElementType; badge?: number; section?: string }[] = [
  { id: "painel",       label: "Painel",          icon: LayoutDashboard, section: "Financeiro" },
  { id: "pagar",        label: "Contas a Pagar",   icon: ArrowDownCircle, badge: 7 },
  { id: "receber",      label: "Contas a Receber", icon: ArrowUpCircle,   badge: 3, badgeColor: "amber" },
  { id: "conciliacao",  label: "Conciliação",      icon: RefreshCcw },
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
  conciliacao:  { title: "Conciliação Bancária", sub: "Cruzamento entre extrato bancário e ERP" },
  relatorios:   { title: "Relatórios",         sub: "Demonstrativos financeiros e gerenciais" },
  fornecedores: { title: "Fornecedores",       sub: "Cadastro e gestão de fornecedores" },
  clientes:     { title: "Clientes",           sub: "Carteira de clientes e histórico de recebimentos" },
  categorias:   { title: "Categorias",         sub: "Plano de contas e centros de custo" },
  bancos:       { title: "Bancos e Contas",    sub: "Saldos, extrato e conciliação por conta" },
};

const SCREENS: Record<ScreenId, React.ReactNode> = {
  painel:       <ScreenPainel />,
  pagar:        <ScreenPagar />,
  receber:      <ScreenReceber />,
  conciliacao:  <ScreenConciliacao />,
  relatorios:   <ScreenRelatorios />,
  fornecedores: <ScreenFornecedores />,
  clientes:     <ScreenClientes />,
  categorias:   <ScreenCategorias />,
  bancos:       <ScreenBancos />,
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Finance() {
  const [active, setActive] = useState<ScreenId>("painel");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const meta = SCREEN_META[active];

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
          {/* ── HEADER ── */}
          <div
            className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            {/* Logo + título */}
            <div className="hidden sm:flex items-center gap-3">
              <img src={sgtLogo} alt="SGT" className="h-7 w-auto" />
              <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                <span className="text-[16px] font-black tracking-[-0.03em] text-white">{meta.title}</span>
              </div>
            </div>

            {/* Badge live */}
            <div className="hidden sm:flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-2.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-300">Financeiro</span>
            </div>

            {/* Subtitle */}
            <span className="hidden lg:block text-[12px] text-slate-500 border-l border-[var(--sgt-divider)] pl-3">{meta.sub}</span>

            <div className="ml-auto flex items-center gap-2">
              <HomeButton />
              <div className="sm:hidden"><MobileNav /></div>
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
                        onClick={() => setActive(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 rounded-lg mx-1 ${sidebarCollapsed ? "justify-center" : ""} ${
                          isActive
                            ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/25"
                            : "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300"
                        }`}
                        style={{ width: sidebarCollapsed ? "calc(100% - 8px)" : "calc(100% - 8px)" }}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.badge && (
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

              {/* Collapse toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center justify-center h-10 border-t text-slate-600 hover:text-slate-400 transition-colors"
                style={{ borderColor: "var(--sgt-border-subtle)" }}
                title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {sidebarCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5" />
                  : <ChevronLeft className="h-3.5 w-3.5" />
                }
              </button>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-4">
              {SCREENS[active]}
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}
