import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FinancialDataProvider } from "@/contexts/FinancialDataContext";
import Index from "./pages/Index";
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
        <FinancialDataProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contas-a-receber" element={<ContasAReceber />} />
            <Route path="/contas-a-pagar" element={<ContasAPagar />} />
            <Route path="/indicadores/:id" element={<IndicadorDetalhe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FinancialDataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
