import { useState } from "react";
import { getBankLogoUrl } from "@/lib/bankLogos";

interface BankLogoProps {
  nome?: string | null;
  codigo?: string | null;
  sigla: string;
  size?: number;
  className?: string;
  rounded?: string;
}

/**
 * Renderiza o logotipo oficial do banco (via Clearbit Logo API).
 * Faz fallback para a sigla quando o domínio não é conhecido ou a imagem falha.
 */
export function BankLogo({
  nome,
  codigo,
  sigla,
  size = 40,
  className = "",
  rounded = "rounded-xl",
}: BankLogoProps) {
  const url = getBankLogoUrl(nome, codigo);
  const [failed, setFailed] = useState(false);
  const showImg = url && !failed;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden border border-white/[0.08] bg-white ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={url!}
          alt={nome ?? sigla}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
          loading="lazy"
        />
      ) : (
        <span className="text-[11px] font-black text-slate-800">{sigla}</span>
      )}
    </div>
  );
}
