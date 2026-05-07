import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RAW } from "@/lib/theme";

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
  if (v.temAtraso) return RAW.accent.rose;
  if (v.perc === 0) return RAW.accent.amber;
  return RAW.accent.cyan;
};

function FitBounds({ pontos }: { pontos: MapVeiculo[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pontos.length) return;
    const bounds = pontos.map(p => [p.latitude, p.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }, [pontos, map]);
  return null;
}

export function VeiculosMap({ veiculos }: { veiculos: MapVeiculo[] }) {
  const center: [number, number] = veiculos.length
    ? [veiculos[0].latitude, veiculos[0].longitude]
    : [-15.78, -47.92]; // Brasil

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
          <CircleMarker
            key={i}
            center={[v.latitude, v.longitude]}
            radius={7}
            pathOptions={{ color: "#ffffff66", weight: 1, fillColor: c, fillOpacity: 0.9 }}
          >
            <Popup>
              <div style={{ fontFamily: "ui-sans-serif, system-ui", minWidth: 180 }}>
                <div style={{ fontWeight: 700, color: c, fontSize: 13 }}>{v.veiculo}</div>
                <div style={{ fontSize: 12, color: "#334155" }}>{v.motorista ?? "—"}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {v.rota}
                </div>
                <div style={{ fontSize: 11, color: "#0f172a", marginTop: 4 }}>
                  <strong>{v.perc.toFixed(0)}%</strong> concluído
                </div>
                {v.descSituacao && (
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    {v.descSituacao}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
