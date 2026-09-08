import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinancialDataProvider } from "@/contexts/FinancialDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/shared/AppLayout";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { RouteTransition } from "@/components/shared/RouteTransition";

// ── Lazy loading — cada página é um chunk separado ───────────────────────────
const Index              = lazyWithRetry(() => import("./pages/Index"));
const Login              = lazyWithRetry(() => import("./pages/Login"));
const Home               = lazyWithRetry(() => import("./pages/Home"));
const PainelAdministrativo = lazyWithRetry(() => import("./pages/admin/PainelAdministrativo"));
const Chamados           = lazyWithRetry(() => import("./pages/Chamados"));
const ContasAReceber     = lazyWithRetry(() => import("./pages/ContasAReceber"));
const ContasAPagar       = lazyWithRetry(() => import("./pages/ContasAPagar"));
const NotFound           = lazyWithRetry(() => import("./pages/NotFound"));
const IndicadorDetalhe   = lazyWithRetry(() => import("./pages/IndicadorDetalhe"));
const Indicadores        = lazyWithRetry(() => import("./pages/Indicadores"));
const FinanciamentoFrota = lazyWithRetry(() => import("./pages/FinanciamentoFrota"));
const Faturamento        = lazyWithRetry(() => import("./pages/Faturamento"));
const EmDesenvolvimento  = lazyWithRetry(() => import("./pages/EmDesenvolvimento"));
const Frota              = lazyWithRetry(() => import("./pages/Frota"));
const Manutencao         = lazyWithRetry(() => import("./pages/Manutencao"));
const Compras            = lazyWithRetry(() => import("./pages/Compras"));
const Abastecimento      = lazyWithRetry(() => import("./pages/Abastecimento"));
const Rh                 = lazyWithRetry(() => import("./pages/Rh"));
const Operacional        = lazyWithRetry(() => import("./pages/Operacional"));
const Executivo          = lazyWithRetry(() => import("./pages/Executivo"));
const Finance            = lazyWithRetry(() => import("./pages/Finance"));
const Fiscal             = lazyWithRetry(() => import("./pages/Fiscal"));
const SgtWorkspace            = lazyWithRetry(() => import("./pages/SgtWorkspace"));
const VisualRodoparWorkspace  = lazyWithRetry(() => import("./pages/VisualRodoparWorkspace"));
const ReceitaFlowWorkspace    = lazyWithRetry(() => import("./pages/ReceitaFlowWorkspace"));
const SofiaChat               = lazyWithRetry(() => import("./pages/SofiaChat"));
const ProcessosWorkspace      = lazyWithRetry(() => import("./pages/ProcessosWorkspace"));
const Pneus                   = lazyWithRetry(() => import("./pages/Pneus"));
const Welcome                 = lazyWithRetry(() => import("./pages/Welcome"));
const SetPassword             = lazyWithRetry(() => import("./pages/SetPassword"));

// ── QueryClient com configurações otimizadas ─────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000,
      gcTime:              10 * 60 * 1000,
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
    },
  },
});

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <FinancialDataProvider>
            <Routes>
              <Route element={<RouteTransition />}>
                <Route path="/"         element={<Welcome />} />
                <Route path="/welcome"  element={<Welcome />} />
                <Route path="/login"    element={<Login />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/home"     element={<ProtectedRoute><Home /></ProtectedRoute>} />
                {/* ── Financeiro ── */}
                <Route path="/dashboard"        element={<ProtectedRoute requiredPage="fin-realizado"><AppLayout><Index /></AppLayout></ProtectedRoute>} />
                <Route path="/contas-a-receber" element={<ProtectedRoute requiredPage="fin-receber"><AppLayout><ContasAReceber /></AppLayout></ProtectedRoute>} />
                <Route path="/contas-a-pagar"   element={<ProtectedRoute requiredPage="fin-pagar"><AppLayout><ContasAPagar /></AppLayout></ProtectedRoute>} />
                <Route path="/financeiro"       element={<ProtectedRoute requiredPage="fin-painel"><AppLayout><Finance /></AppLayout></ProtectedRoute>} />
                <Route path="/fiscal"           element={<ProtectedRoute requiredPage="ext-fiscal"><AppLayout><Fiscal /></AppLayout></ProtectedRoute>} />
                {/* ── Gestão ── */}
                <Route path="/indicadores"      element={<ProtectedRoute requiredPage="ext-indicadores"><AppLayout><Indicadores /></AppLayout></ProtectedRoute>} />
                <Route path="/indicadores/:id"  element={<ProtectedRoute requiredPage="ext-indicadores"><AppLayout><IndicadorDetalhe /></AppLayout></ProtectedRoute>} />
                <Route path="/executivo"        element={<ProtectedRoute requiredPage="ext-executivo"><AppLayout><Executivo /></AppLayout></ProtectedRoute>} />
                <Route path="/faturamento"      element={<ProtectedRoute requiredPage="ext-faturamento"><AppLayout><Faturamento /></AppLayout></ProtectedRoute>} />
                {/* ── Operação ── */}
                <Route path="/operacional"      element={<ProtectedRoute requiredPage="ext-operacional"><AppLayout><Operacional /></AppLayout></ProtectedRoute>} />
                <Route path="/frota"            element={<ProtectedRoute requiredPage="ext-frota"><AppLayout><Frota /></AppLayout></ProtectedRoute>} />
                <Route path="/financiamento-frota" element={<ProtectedRoute requiredPage="ext-fin-frota"><AppLayout><FinanciamentoFrota /></AppLayout></ProtectedRoute>} />
                <Route path="/manutencao"       element={<ProtectedRoute requiredPage="ext-manutencao"><AppLayout><Manutencao /></AppLayout></ProtectedRoute>} />
                <Route path="/abastecimento"    element={<ProtectedRoute requiredPage="ext-abastecimento"><AppLayout><Abastecimento /></AppLayout></ProtectedRoute>} />
                <Route path="/pneus"           element={<ProtectedRoute requiredPage="ext-pneus"><AppLayout><Pneus /></AppLayout></ProtectedRoute>} />
                {/* ── Compras ── */}
                <Route path="/compras"          element={<ProtectedRoute requiredPage="ext-compras"><AppLayout><Compras /></AppLayout></ProtectedRoute>} />
                {/* ── RH ── */}
                <Route path="/rh"               element={<ProtectedRoute requiredPage="ext-rh"><AppLayout><Rh /></AppLayout></ProtectedRoute>} />
                {/* ── Suporte ── */}
                <Route path="/chamados"         element={<ProtectedRoute requiredPage="ext-chamados"><AppLayout><Chamados /></AppLayout></ProtectedRoute>} />
                {/* ── Portais ── */}
                <Route path="/visual-rodopar"  element={<ProtectedRoute requiredPage="portal-visual"><AppLayout><VisualRodoparWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="/receitaflow"     element={<ProtectedRoute requiredPage="portal-receitaflow"><AppLayout><ReceitaFlowWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="/sofia"           element={<ProtectedRoute requiredPage="sofia-ai"><SofiaChat /></ProtectedRoute>} />
                <Route path="/processos"      element={<ProtectedRoute><AppLayout><ProcessosWorkspace /></AppLayout></ProtectedRoute>} />
                {/* ── Admin / telas livres ── */}
                <Route path="/em-desenvolvimento/:modulo" element={<ProtectedRoute><AppLayout><EmDesenvolvimento /></AppLayout></ProtectedRoute>} />
                <Route path="/admin"            element={<ProtectedRoute requiredRole="admin"><AppLayout><PainelAdministrativo /></AppLayout></ProtectedRoute>} />
                <Route path="/sgt"              element={<ProtectedRoute><AppLayout><SgtWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </FinancialDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
