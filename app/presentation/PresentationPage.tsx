"use client";

import { useEffect, useState } from "react";

export default function PresentationPage() {
  const [html, setHtml] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/presentation/index.html")
      .then((r) => r.text())
      .then((t) => {
        setHtml(t);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0e",
        color: "#f5b042",
        fontSize: "1.2rem",
        fontWeight: 700,
      }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      style={{
        width: "100vw",
        height: "100vh",
        border: "none",
        margin: 0,
        padding: 0,
        position: "fixed",
        top: 0,
        left: 0,
        inset: 0,
      }}
      title="أكك لايف — عرض تقديمي"
    />
  );
}
