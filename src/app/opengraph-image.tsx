import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 96,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#B61C1C" }} />
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1, color: "#0a0a0a" }}>
            AXUS ID
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.1,
            color: "#0a0a0a",
          }}
        >
          One secure account for every app you use.
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#737373" }}>
          Passkeys · OAuth 2.0 · OpenID Connect · SAML
        </div>
      </div>
    ),
    { ...size },
  );
}
