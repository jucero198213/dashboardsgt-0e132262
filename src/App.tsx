import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinancialDataProvider } from "@/contexts/FinancialDataContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import PainelAdministrativo from "./pages/admin/PainelAdministrativo";
import ContasAReceber from "./pages/ContasAReceber";
import ContasAPagar from "./pages/ContasAPagar";
import NotFound from "./pages/NotFound";
import IndicadorDetalhe from "./pages/IndicadorDetalhe";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FinancialDataProvider>
            <Routes>
              <Route path="/"         element={<Landing />} />
              <Route path="/login"    element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/contas-a-receber" element={<ProtectedRoute><ContasAReceber /></ProtectedRoute>} />
              <Route path="/contas-a-pagar"   element={<ProtectedRoute><ContasAPagar /></ProtectedRoute>} />
              <Route path="/indicadores/:id"  element={<ProtectedRoute><IndicadorDetalhe /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><PainelAdministrativo /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FinancialDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
