import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./globals.css";

const AppShell = React.lazy(() => import("./AppShell"));

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown runtime error";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error("POS runtime error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "Inter, sans-serif", color: "#fff", background: "#111", minHeight: "100vh" }}>
          <h2 style={{ marginTop: 0 }}>App failed to load</h2>
          <p style={{ color: "#fda4af" }}>{this.state.message}</p>
          <p style={{ color: "#cbd5e1" }}>Open browser console and share the full error text.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading POS...</div>}>
        <AppShell />
      </Suspense>
    </RootErrorBoundary>
  </React.StrictMode>
);
