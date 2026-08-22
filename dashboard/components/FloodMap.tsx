"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

// Fix default Leaflet marker icon in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface FloodData {
  flood_predicted: boolean;
  probability: number;
  risk_level: string;
  features: {
    rainfall_1h: number;
    rainfall_24h: number;
    soil_moisture: number;
    elevation: number;
    drainage: number;
  };
  advice: string[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const DEFAULT_LAT = 12.9716;
const DEFAULT_LON = 77.5946;

// ── Risk colour helpers ───────────────────────────────────────────────────────

function riskColor(level: string) {
  const map: Record<string, string> = {
    "Very Low": "#22c55e",
    Low: "#86efac",
    Moderate: "#f59e0b",
    High: "#ef4444",
    Extreme: "#7c3aed",
    Unknown: "#94a3b8",
  };
  return map[level] ?? "#94a3b8";
}

function riskBg(level: string) {
  const map: Record<string, string> = {
    "Very Low": "#f0fdf4",
    Low: "#f0fdf4",
    Moderate: "#fffbeb",
    High: "#fef2f2",
    Extreme: "#f5f3ff",
    Unknown: "#f8fafc",
  };
  return map[level] ?? "#f8fafc";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level, color }: { level: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        background: riskBg(level),
        color,
        fontWeight: 700,
        fontSize: 12,
        border: `1px solid ${color}40`,
      }}
    >
      {level}
    </span>
  );
}

function ProbBar({ prob, color }: { prob: number; color: string }) {
  const pct = Math.round(prob * 100);
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
        <span>Probability</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#0f172a" }}>{value}</span>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        padding: "18px 20px",
        marginBottom: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "#475569", textTransform: "uppercase" }}>
        {title}
      </span>
    </div>
  );
}

// ── Flood Panel ───────────────────────────────────────────────────────────────

function FloodPanel({ data }: { data: FloodData }) {
  const color = riskColor(data.risk_level);
  return (
    <Card>
      <SectionTitle icon="🌊" title="Flood Forecast · 12h" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <RiskBadge level={data.risk_level} color={color} />
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            {data.flood_predicted ? "⚠ Flood likely" : "No flood expected"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{Math.round(data.probability * 100)}%</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>chance</div>
        </div>
      </div>
      <ProbBar prob={data.probability} color={color} />
      <div style={{ marginTop: 12 }}>
        <FeatureRow label="Peak rainfall" value={`${data.features.rainfall_1h?.toFixed(1) ?? "—"} mm/h`} />
        <FeatureRow label="24h accumulation" value={`${data.features.rainfall_24h?.toFixed(0) ?? "—"} mm`} />
        <FeatureRow label="Soil moisture" value={`${Math.round((data.features.soil_moisture ?? 0) * 100)}%`} />
        <FeatureRow label="Elevation" value={`${data.features.elevation?.toFixed(0) ?? "—"} m`} />
        <FeatureRow label="Drainage score" value={`${data.features.drainage?.toFixed(1) ?? "—"} / 10`} />
      </div>
      {data.advice.slice(0, 2).map((tip, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 12, color: "#475569" }}>
          <span>💡</span><span>{tip}</span>
        </div>
      ))}
    </Card>
  );
}

// ── Main FloodMap component ───────────────────────────────────────────────────

export default function FloodMap() {
  const [lat] = useState(DEFAULT_LAT);
  const [lon] = useState(DEFAULT_LON);
  const [flood, setFlood] = useState<FloodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [floodRes] = await Promise.allSettled([
          fetch(`${BACKEND}/predict?lat=${lat}&lon=${lon}`).then((r) => r.json()),
        ]);
        if (floodRes.status === "fulfilled") setFlood(floodRes.value);
      } catch {
        setError("Failed to load risk data — is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [lat, lon]);

  const floodColor  = flood    ? riskColor(flood.risk_level)      : "#94a3b8";

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Left sidebar ── */}
      <div
        style={{
          width: 360,
          minWidth: 320,
          height: "100vh",
          overflowY: "auto",
          background: "#f8fafc",
          borderRight: "1px solid #e2e8f0",
          padding: "20px 16px 40px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a", letterSpacing: -0.5 }}>
            JeevanSetu Dashboard
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Bengaluru · {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>

        {/* Risk summary row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Flood",    color: floodColor,   level: flood?.risk_level      ?? "—" },
          ].map((r) => (
            <div key={r.label} style={{
              flex: 1, borderRadius: 12, background: "#fff",
              border: `1px solid ${r.color}40`,
              padding: "10px 8px", textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.level}</div>
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>
            Loading risk data…
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: 14, color: "#991b1b", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {flood      && <FloodPanel      data={flood} />}
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={[lat, lon]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Flood risk radius */}
          {flood && (
            <Circle
              center={[lat, lon]}
              radius={15000}
              pathOptions={{ color: floodColor, fillColor: floodColor, fillOpacity: 0.12, weight: 2 }}
            />
          )}

          {/* Main location marker */}
          <Marker position={[lat, lon]}>
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Bengaluru</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b", fontSize: 12 }}>Flood risk</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: floodColor }}>{flood?.risk_level ?? "—"}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Map legend */}
        <div style={{
          position: "absolute", bottom: 24, right: 16, zIndex: 1000,
          background: "rgba(255,255,255,0.95)", borderRadius: 12,
          border: "1px solid #e2e8f0", padding: "10px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)", fontSize: 11,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Legend</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: `${floodColor}30`, border: `2px solid ${floodColor}` }} />
            <span style={{ color: "#475569" }}>Flood zone (15km)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
