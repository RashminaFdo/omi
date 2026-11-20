import { ImageResponse } from "next/og";

export const alt = "Omi (ඕමි) — Sri Lankan Multiplayer Card Game by Rashmina Fernando";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 40%, #114737 0%, #08241c 58%, #04120e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "48px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "48px",
            marginBottom: "20px",
          }}
        >
          <span style={{ color: "#f8fafc" }}>♠</span>
          <span style={{ color: "#f43f5e" }}>♥</span>
          <span style={{ color: "#f43f5e" }}>♦</span>
          <span style={{ color: "#f8fafc" }}>♣</span>
        </div>

        <div
          style={{
            fontSize: "84px",
            fontWeight: 900,
            letterSpacing: "4px",
            color: "#fde68a",
            marginBottom: "14px",
          }}
        >
          OMI
        </div>

        <div
          style={{
            fontSize: "34px",
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: "28px",
            textAlign: "center",
          }}
        >
          The Classic Sri Lankan 4-Player Card Game
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "22px",
            fontWeight: 700,
            color: "#fcd34d",
          }}
        >
          <span
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(251,191,36,0.4)",
            }}
          >
            Real-Time Multiplayer
          </span>
          <span
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(251,191,36,0.4)",
            }}
          >
            English &amp; Sinhala
          </span>
          <span
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(251,191,36,0.4)",
            }}
          >
            Play Free Online
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "20px",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 600,
          }}
        >
          omi.rashmina.dev • Created by Rashmina Fernando
        </div>
      </div>
    ),
    { ...size }
  );
}
