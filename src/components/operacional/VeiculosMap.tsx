import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RAW } from "@/lib/theme";
import cavaloSgt from "@/assets/cavalo_sgt.png";

export interface MapVeiculo {
  veiculo: string;
  motorista: string | null;
  latitude: number;
  longitude: number;
  perc: number;
  rota: string;
  emManutencao: boolean;
  temAtraso: boolean;
  descSituacao: string | null;
}

const cor = (v: MapVeiculo) => {
  if (v.emManutencao) return RAW.accent.violet;
  if (v.temAtraso)    return RAW.accent.rose;
  if (v.perc === 0)   return RAW.accent.amber;
  return RAW.accent.cyan;
};

// Cria ícone customizado com o cavalo SGT + glow colorido por status
function criarIcone(color: string): L.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="32" viewBox="0 0 52 32">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${color}" flood-opacity="0.9"/>
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${color}" flood-opacity="0.5"/>
        </filter>
      </defs>
      <image href="${cavaloSgt}" x="0" y="0" width="52" height="32" filter="url(#glow)"/>
    </svg>
  `;
  const url = `data:image/svg+xml;base64,${btoa(svg)}`;
  return L.icon({
    iconUrl: url,
    iconSize:   [52, 32],
    iconAnchor: [26, 16],
    popupAnchor: [0, -20],
  });
}

function FitBounds({ pontos }: { pontos: MapVeiculo[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pontos.length) return;
    const bounds = pontos.map(p => [p.latitude, p.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [pontos, map]);
  return null;
}

export function VeiculosMap({ veiculos }: { veiculos: MapVeiculo[] }) {
  const center: [number, number] = veiculos.length
    ? [veiculos[0].latitude, veiculos[0].longitude]
    : [-15.78, -47.92];

  return (
    <MapContainer
      center={center}
      zoom={5}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", background: "#060d1a" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds pontos={veiculos} />
      {veiculos.map((v, i) => {
        const c = cor(v);
        return (
          <Marker key={i} position={[v.latitude, v.longitude]} icon={criarIcone(c)}>
            <Popup>
              <div style={{ fontFamily: "ui-sans-serif, system-ui", minWidth: 180 }}>
                <div style={{ fontWeight: 700, color: c, fontSize: 13 }}>{v.veiculo}</div>
                <div style={{ fontSize: 12, color: "#334155" }}>{v.motorista ?? "—"}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{v.rota}</div>
                <div style={{ fontSize: 11, color: "#0f172a", marginTop: 4 }}>
                  <strong>{v.perc.toFixed(0)}%</strong> concluído
                </div>
                {v.descSituacao && (
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{v.descSituacao}</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
