import { useState } from "react";
import { Settings, Mail, Zap, Link2, Save, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const integrations = [
  { name: "Power BI Embedded", desc: "Azure Service Principal ativo", status: "Conectado", color: "emerald" },
  { name: "SQL Server (DW)", desc: "192.168.1.50 via Cloudflare Tunnel", status: "Online", color: "emerald" },
  { name: "Supabase", desc: "Banco de dados principal", status: "Ativo", color: "emerald" },
  { name: "TOTVS Protheus", desc: "ERP — sincronização diária", status: "Parcial", color: "amber" },
  { name: "Vercel Deploy", desc: "CI/CD automático", status: "Ativo", color: "emerald" },
];

const statusStyle: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export default function Configuracoes() {
  const [saved, setSaved] = useState(false);
  const [features, setFeatures] = useState({
    twofa: true, audit: true, email: true, maintenance: false, api: true, cache: true,
  });

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const featureList = [
    { key: "twofa", name: "Autenticação 2FA", desc: "Exigir segundo fator para todos os usuários" },
    { key: "audit", name: "Logs de auditoria", desc: "Registrar todas as ações dos usuários" },
    { key: "email", name: "Notificações por e-mail", desc: "Alertas automáticos do sistema" },
    { key: "maintenance", name: "Modo manutenção", desc: "Bloquear acesso de usuários comuns" },
    { key: "api", name: "Acesso via API", desc: "Habilitar endpoints REST externos" },
    { key: "cache", name: "Cache de relatórios", desc: "Cachear relatórios Power BI por 15 min" },
  ] as const;

  return (
    <div className="space-y-5">
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" /> Configurações salvas com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left col */}
        <div className="space-y-4">
          {/* Empresa */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-blue-400" /> Dados da Empresa
            </h3>
            <div className="space-y-3">
              {[
                { label: "Nome da Empresa", value: "SGT Logística S.A." },
                { label: "E-mail de suporte", value: "ti@sgtlog.com.br" },
              ].map((f) => (
                <div key={f.label}>
                  <Label className="text-[10px] text-white/40 uppercase tracking-wider">{f.label}</Label>
                  <Input defaultValue={f.value}
                    className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white h-9 text-sm" />
                </div>
              ))}
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Fuso horário</Label>
                <Select defaultValue="sp">
                  <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                    <SelectItem value="sp">America/Sao_Paulo (UTC-3)</SelectItem>
                    <SelectItem value="manaus">America/Manaus (UTC-4)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Idioma padrão</Label>
                <Select defaultValue="pt">
                  <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                    <SelectItem value="pt">Português (Brasil)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SMTP */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-purple-400" /> Configurações de E-mail (SMTP)
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Servidor SMTP</Label>
                <Input defaultValue="smtp.sgtlog.com.br"
                  className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-white/40 uppercase tracking-wider">Porta</Label>
                  <Input defaultValue="587"
                    className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] text-white/40 uppercase tracking-wider">Segurança</Label>
                  <Select defaultValue="tls">
                    <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-white/10 text-white/50 hover:bg-white/5 hover:text-white">
                📡 Testar conexão
              </Button>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Features */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" /> Funcionalidades
            </h3>
            <div className="divide-y divide-white/[0.05]">
              {featureList.map(({ key, name, desc }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{desc}</p>
                  </div>
                  <Switch
                    checked={features[key]}
                    onCheckedChange={() => toggleFeature(key)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-teal-400" /> Integrações
            </h3>
            <div className="divide-y divide-white/[0.05]">
              {integrations.map((int) => (
                <div key={int.name} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{int.name}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{int.desc}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${statusStyle[int.color]}`}>
                    {int.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white text-sm gap-2">
          <Save className="w-4 h-4" /> Salvar configurações
        </Button>
        <Button variant="outline" className="text-sm border-white/10 text-white/50 hover:bg-white/5 hover:text-white gap-2">
          <RotateCcw className="w-4 h-4" /> Restaurar padrões
        </Button>
      </div>
    </div>
  );
}
