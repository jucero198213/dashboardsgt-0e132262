import { useState } from "react";
import { Shield, Lock, Monitor, Smartphone, Globe, Save, Plus, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Session {
  id: number;
  device: string;
  ip: string;
  location: string;
  time: string;
  current: boolean;
  mobile: boolean;
}

const INITIAL_SESSIONS: Session[] = [
  { id: 1, device: "Chrome · Windows 11", ip: "192.168.1.12", location: "Valinhos, SP", time: "Agora", current: true, mobile: false },
  { id: 2, device: "Safari · iPhone 15", ip: "189.32.45.67", location: "Campinas, SP", time: "há 20 min", current: false, mobile: true },
  { id: 3, device: "Chrome · macOS", ip: "192.168.1.21", location: "Valinhos, SP", time: "há 2h", current: false, mobile: false },
];

export default function Seguranca() {
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [ips, setIps] = useState(["192.168.0.0/16", "10.0.0.0/8", "187.45.0.0/24"]);
  const [pwdLen, setPwdLen] = useState([12]);
  const [authSettings, setAuthSettings] = useState({
    uppercase: true, numbers: true, special: true,
    sms2fa: false, azureSSO: true, google: false,
  });

  const toggle = (key: keyof typeof authSettings) =>
    setAuthSettings((p) => ({ ...p, [key]: !p[key] }));

  const removeSession = (id: number) =>
    setSessions((prev) => prev.filter((s) => s.id !== id));

  const removeIP = (i: number) =>
    setIps((prev) => prev.filter((_, idx) => idx !== i));

  const addIP = () => {
    const v = window.prompt("Insira o IP ou range CIDR:");
    if (v?.trim()) setIps((prev) => [...prev, v.trim()]);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" /> Políticas de segurança atualizadas!
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Score de segurança", value: "87/100", color: "text-emerald-400", sub: "↑ +5 esta semana" },
          { label: "Sessões ativas", value: String(sessions.length), sub: "dispositivos" },
          { label: "2FA habilitado", value: "19/24", color: "text-emerald-400", sub: "usuários" },
          { label: "Bloqueados 24h", value: "12", color: "text-red-400", sub: "tentativas" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.color || "text-white"}`}>{s.value}</p>
            <p className="text-[11px] text-white/30 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left */}
        <div className="space-y-4">
          {/* Password policy */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-blue-400" /> Política de Senhas
            </h3>
            <div className="mb-4">
              <Label className="text-[10px] text-white/40 uppercase tracking-wider block mb-3">
                Tamanho mínimo: <span className="text-blue-400 font-semibold">{pwdLen[0]} caracteres</span>
              </Label>
              <Slider min={6} max={20} step={1} value={pwdLen} onValueChange={setPwdLen}
                className="[&>span]:bg-blue-600 [&>span]:border-blue-500" />
            </div>
            <div className="divide-y divide-white/[0.05]">
              {[
                { key: "uppercase", label: "Letras maiúsculas obrigatórias" },
                { key: "numbers", label: "Números obrigatórios" },
                { key: "special", label: "Caracteres especiais" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <p className="text-sm text-white">{label}</p>
                  <Switch checked={authSettings[key as keyof typeof authSettings] as boolean}
                    onCheckedChange={() => toggle(key as keyof typeof authSettings)}
                    className="data-[state=checked]:bg-blue-600" />
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Expiração de senha</Label>
                <Select defaultValue="90">
                  <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="never">Nunca expirar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Tentativas antes do bloqueio</Label>
                <Select defaultValue="5">
                  <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                    <SelectItem value="3">3 tentativas</SelectItem>
                    <SelectItem value="5">5 tentativas</SelectItem>
                    <SelectItem value="10">10 tentativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* IP whitelist */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-400" /> IPs Permitidos
              </h3>
              <Button size="sm" variant="outline" onClick={addIP}
                className="text-xs border-white/10 text-white/50 hover:bg-white/5 hover:text-white h-7 gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {ips.map((ip, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="text-xs font-mono text-white">{ip}</span>
                <Button size="sm" variant="ghost" onClick={() => removeIP(i)}
                  className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {ips.length === 0 && <p className="text-sm text-white/30 py-2">Nenhum IP cadastrado — acesso irrestrito.</p>}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Sessions */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" /> Sessões Ativas
              </h3>
              <Button size="sm" variant="ghost"
                onClick={() => setSessions((prev) => prev.filter((s) => s.current))}
                className="text-xs text-red-400 hover:bg-red-500/10 h-7">
                Encerrar todas
              </Button>
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    {s.mobile ? <Smartphone className="w-4 h-4 text-white/50" /> : <Monitor className="w-4 h-4 text-white/50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-white truncate">{s.device}</p>
                      {s.current && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">atual</span>}
                    </div>
                    <p className="text-[10px] text-white/35 mt-0.5">{s.ip} · {s.location} · {s.time}</p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="ghost" onClick={() => removeSession(s.id)}
                      className="text-xs text-red-400 hover:bg-red-500/10 h-7 flex-shrink-0">
                      Encerrar
                    </Button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-white/30 py-2 text-center">Nenhuma sessão ativa.</p>}
            </div>
          </div>

          {/* Auth methods */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-400" /> Métodos de Autenticação
            </h3>
            <div className="divide-y divide-white/[0.05]">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">2FA via TOTP</p>
                  <p className="text-[11px] text-white/35">Google Authenticator, Authy</p>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ativo</span>
              </div>
              {[
                { key: "sms2fa", label: "2FA via SMS", desc: "Código por mensagem de texto" },
                { key: "azureSSO", label: "SSO via Azure AD", desc: "Microsoft Entra ID" },
                { key: "google", label: "Login com Google", desc: "OAuth 2.0" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-[11px] text-white/35">{desc}</p>
                  </div>
                  <Switch checked={authSettings[key as keyof typeof authSettings] as boolean}
                    onCheckedChange={() => toggle(key as keyof typeof authSettings)}
                    className="data-[state=checked]:bg-blue-600" />
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Chaves de API</p>
                  <p className="text-[11px] text-white/35">4 chaves ativas</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs border-white/10 text-white/50 hover:bg-white/5 hover:text-white h-7">
                  Gerenciar
                </Button>
              </div>
            </div>
            <div className="pt-3">
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white text-sm gap-2">
                <Save className="w-4 h-4" /> Salvar políticas
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
