import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinancialDataProvider } from "@/contexts/FinancialDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Home from "./pages/Home";
import PainelAdministrativo from "./pages/admin/PainelAdministrativo";
import ContasAReceber from "./pages/ContasAReceber";
import ContasAPagar from "./pages/ContasAPagar";
import NotFound from "./pages/NotFound";
import IndicadorDetalhe from "./pages/IndicadorDetalhe";
import Indicadores from "./pages/Indicadores";

const queryClient = new QueryClient();

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
              <Route path="/dashboard" element={<ProtectedRoute requiredPage="dashboard"><Index /></ProtectedRoute>} />
              <Route path="/contas-a-receber" element={<ProtectedRoute requiredPage="dashboard"><ContasAReceber /></ProtectedRoute>} />
              <Route path="/contas-a-pagar"   element={<ProtectedRoute requiredPage="dashboard"><ContasAPagar /></ProtectedRoute>} />
              <Route path="/indicadores"      element={<ProtectedRoute requiredPage="indicadores"><Indicadores /></ProtectedRoute>} />
              <Route path="/indicadores/:id"  element={<ProtectedRoute requiredPage="indicadores"><IndicadorDetalhe /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><PainelAdministrativo /></ProtectedRoute>} />
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
