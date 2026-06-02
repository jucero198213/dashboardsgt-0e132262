import { lazy, Suspense } from "react";
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

// ── Lazy loading — cada página é um chunk separado ───────────────────────────
const Index              = lazy(() => import("./pages/Index"));
const Login              = lazy(() => import("./pages/Login"));
const Home               = lazy(() => import("./pages/Home"));
const PainelAdministrativo = lazy(() => import("./pages/admin/PainelAdministrativo"));
const Chamados           = lazy(() => import("./pages/Chamados"));
const ContasAReceber     = lazy(() => import("./pages/ContasAReceber"));
const ContasAPagar       = lazy(() => import("./pages/ContasAPagar"));
const NotFound           = lazy(() => import("./pages/NotFound"));
const IndicadorDetalhe   = lazy(() => import("./pages/IndicadorDetalhe"));
const Indicadores        = lazy(() => import("./pages/Indicadores"));
const FinanciamentoFrota = lazy(() => import("./pages/FinanciamentoFrota"));
const Faturamento        = lazy(() => import("./pages/Faturamento"));
const EmDesenvolvimento  = lazy(() => import("./pages/EmDesenvolvimento"));
const Frota              = lazy(() => import("./pages/Frota"));
const Manutencao         = lazy(() => import("./pages/Manutencao"));
const Compras            = lazy(() => import("./pages/Compras"));
const Abastecimento      = lazy(() => import("./pages/Abastecimento"));
const Rh                 = lazy(() => import("./pages/Rh"));
const Operacional        = lazy(() => import("./pages/Operacional"));
const Executivo          = lazy(() => import("./pages/Executivo"));
const Finance            = lazy(() => import("./pages/Finance"));
const Fiscal             = lazy(() => import("./pages/Fiscal"));
const SgtWorkspace            = lazy(() => import("./pages/SgtWorkspace"));
const VisualRodoparWorkspace  = lazy(() => import("./pages/VisualRodoparWorkspace"));
const PortalWrWorkspace       = lazy(() => import("./pages/PortalWrWorkspace"));
const ReceitaFlowWorkspace    = lazy(() => import("./pages/ReceitaFlowWorkspace"));
const Welcome                 = lazy(() => import("./pages/Welcome"));

// ── Loading screen mínimo (sem flash, sem layout shift) ───────────────────────
function PageLoader() {
  return (
    <div
      className="flex h-[100dvh] w-full items-center justify-center"
      style={{ backgroundColor: "var(--sgt-bg-base, #020308)" }}
    >
      <div className="h-8 w-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
    </div>
  );
}

// ── QueryClient com configurações otimizadas ─────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000,  // 5 min — não refetch enquanto dado é fresco
      gcTime:              10 * 60 * 1000,  // 10 min — mantém cache em memória
      retry:                1,              // uma retentativa só
      refetchOnWindowFocus: false,          // não refetch ao alterar aba
      refetchOnReconnect:   true,           // refetch ao reconectar internet
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"         element={<Welcome />} />
                <Route path="/welcome"  element={<Welcome />} />
                <Route path="/login"    element={<Login />} />
                <Route path="/home"     element={<ProtectedRoute><Home /></ProtectedRoute>} />
                {/* ── Financeiro ── */}
                <Route path="/dashboard"        element={<ProtectedRoute requiredModule="financeiro"><AppLayout><Index /></AppLayout></ProtectedRoute>} />
                <Route path="/contas-a-receber" element={<ProtectedRoute requiredModule="financeiro"><AppLayout><ContasAReceber /></AppLayout></ProtectedRoute>} />
                <Route path="/contas-a-pagar"   element={<ProtectedRoute requiredModule="financeiro"><AppLayout><ContasAPagar /></AppLayout></ProtectedRoute>} />
                <Route path="/financeiro"       element={<ProtectedRoute requiredModule="financeiro"><AppLayout><Finance /></AppLayout></ProtectedRoute>} />
                <Route path="/fiscal"           element={<ProtectedRoute requiredModule="financeiro"><AppLayout><Fiscal /></AppLayout></ProtectedRoute>} />
                {/* ── Gestão ── */}
                <Route path="/indicadores"      element={<ProtectedRoute requiredModule="gestao"><AppLayout><Indicadores /></AppLayout></ProtectedRoute>} />
                <Route path="/indicadores/:id"  element={<ProtectedRoute requiredModule="gestao"><AppLayout><IndicadorDetalhe /></AppLayout></ProtectedRoute>} />
                <Route path="/executivo"        element={<ProtectedRoute requiredModule="gestao"><AppLayout><Executivo /></AppLayout></ProtectedRoute>} />
                <Route path="/faturamento"      element={<ProtectedRoute requiredModule="gestao"><AppLayout><Faturamento /></AppLayout></ProtectedRoute>} />
                {/* ── Operação ── */}
                <Route path="/operacional"      element={<ProtectedRoute requiredModule="operacao"><AppLayout><Operacional /></AppLayout></ProtectedRoute>} />
                <Route path="/frota"            element={<ProtectedRoute requiredModule="operacao"><AppLayout><Frota /></AppLayout></ProtectedRoute>} />
                <Route path="/financiamento-frota" element={<ProtectedRoute requiredModule="operacao"><AppLayout><FinanciamentoFrota /></AppLayout></ProtectedRoute>} />
                <Route path="/manutencao"       element={<ProtectedRoute requiredModule="operacao"><AppLayout><Manutencao /></AppLayout></ProtectedRoute>} />
                <Route path="/abastecimento"    element={<ProtectedRoute requiredModule="operacao"><AppLayout><Abastecimento /></AppLayout></ProtectedRoute>} />
                {/* ── Compras ── */}
                <Route path="/compras"          element={<ProtectedRoute requiredModule="compras"><AppLayout><Compras /></AppLayout></ProtectedRoute>} />
                {/* ── RH ── */}
                <Route path="/rh"               element={<ProtectedRoute requiredModule="rh"><AppLayout><Rh /></AppLayout></ProtectedRoute>} />
                {/* ── Suporte ── */}
                <Route path="/chamados"         element={<ProtectedRoute requiredModule="suporte"><AppLayout><Chamados /></AppLayout></ProtectedRoute>} />
                {/* ── Admin / misc ── */}
                <Route path="/em-desenvolvimento/:modulo" element={<ProtectedRoute><AppLayout><EmDesenvolvimento /></AppLayout></ProtectedRoute>} />
                <Route path="/admin"            element={<ProtectedRoute requiredRole="admin"><AppLayout><PainelAdministrativo /></AppLayout></ProtectedRoute>} />
                <Route path="/sgt"              element={<ProtectedRoute><AppLayout><SgtWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="/visual-rodopar"  element={<ProtectedRoute><AppLayout><VisualRodoparWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="/portal-wr"       element={<ProtectedRoute><AppLayout><PortalWrWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="/receitaflow"     element={<ProtectedRoute><AppLayout><ReceitaFlowWorkspace /></AppLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </FinancialDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
