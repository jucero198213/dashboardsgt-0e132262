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
import Index from "./pages/Index";
import Login from "./pages/Login";
import Home from "./pages/Home";
import PainelAdministrativo from "./pages/admin/PainelAdministrativo";
import Chamados from "./pages/Chamados";
import ContasAReceber from "./pages/ContasAReceber";
import ContasAPagar from "./pages/ContasAPagar";
import NotFound from "./pages/NotFound";
import IndicadorDetalhe from "./pages/IndicadorDetalhe";
import Indicadores from "./pages/Indicadores";
import FinanciamentoFrota from "./pages/FinanciamentoFrota";
import Faturamento from "./pages/Faturamento";
import EmDesenvolvimento from "./pages/EmDesenvolvimento";
import Frota from "./pages/Frota";
import Manutencao from "./pages/Manutencao";
import Compras from "./pages/Compras";
import Abastecimento from "./pages/Abastecimento";
import Rh from "./pages/Rh";
import Operacional from "./pages/Operacional";
import Executivo from "./pages/Executivo";
import Finance from "./pages/Finance";

const queryClient = new QueryClient();

// Registra handler de atualização automática do Service Worker

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FinancialDataProvider>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FinancialDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
