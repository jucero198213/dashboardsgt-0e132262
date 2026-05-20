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
        <AuthProvider>
          <FinancialDataProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"         element={<Navigate to="/login" replace />} />
                <Route path="/login"    element={<Login />} />
                <Route path="/home"     element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute requiredPage="dashboard"><AppLayout><Index /></AppLayout></ProtectedRoute>} />
                <Route path="/contas-a-receber" element={<ProtectedRoute requiredPage="dashboard"><AppLayout><ContasAReceber /></AppLayout></ProtectedRoute>} />
                <Route path="/contas-a-pagar"   element={<ProtectedRoute requiredPage="dashboard"><AppLayout><ContasAPagar /></AppLayout></ProtectedRoute>} />
                <Route path="/indicadores"      element={<ProtectedRoute requiredPage="indicadores"><AppLayout><Indicadores /></AppLayout></ProtectedRoute>} />
                <Route path="/indicadores/:id"  element={<ProtectedRoute requiredPage="indicadores"><AppLayout><IndicadorDetalhe /></AppLayout></ProtectedRoute>} />
                <Route path="/financiamento-frota" element={<ProtectedRoute><AppLayout><FinanciamentoFrota /></AppLayout></ProtectedRoute>} />
                <Route path="/faturamento" element={<ProtectedRoute><AppLayout><Faturamento /></AppLayout></ProtectedRoute>} />
                <Route path="/frota" element={<ProtectedRoute><AppLayout><Frota /></AppLayout></ProtectedRoute>} />
                <Route path="/manutencao" element={<ProtectedRoute><AppLayout><Manutencao /></AppLayout></ProtectedRoute>} />
                <Route path="/em-desenvolvimento/:modulo" element={<ProtectedRoute><AppLayout><EmDesenvolvimento /></AppLayout></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AppLayout><PainelAdministrativo /></AppLayout></ProtectedRoute>} />
                <Route path="/chamados" element={<ProtectedRoute><AppLayout><Chamados /></AppLayout></ProtectedRoute>} />
                <Route path="/compras"      element={<ProtectedRoute><AppLayout><Compras /></AppLayout></ProtectedRoute>} />
                <Route path="/abastecimento" element={<ProtectedRoute><AppLayout><Abastecimento /></AppLayout></ProtectedRoute>} />
                <Route path="/rh"           element={<ProtectedRoute><AppLayout><Rh /></AppLayout></ProtectedRoute>} />
                <Route path="/operacional"  element={<ProtectedRoute><AppLayout><Operacional /></AppLayout></ProtectedRoute>} />
                <Route path="/executivo"    element={<ProtectedRoute><AppLayout><Executivo /></AppLayout></ProtectedRoute>} />
                <Route path="/financeiro"  element={<ProtectedRoute><AppLayout><Finance /></AppLayout></ProtectedRoute>} />
                <Route path="/fiscal"     element={<ProtectedRoute><AppLayout><Fiscal /></AppLayout></ProtectedRoute>} />
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
