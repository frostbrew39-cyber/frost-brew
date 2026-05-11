import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./globals.css";
const AppShell = React.lazy(() => import("./AppShell"));
class RootErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: "" };
    }
    static getDerivedStateFromError(error) {
        const message = error instanceof Error ? error.message : "Unknown runtime error";
        return { hasError: true, message };
    }
    componentDidCatch(error) {
        console.error("POS runtime error:", error);
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { style: { padding: 24, fontFamily: "Inter, sans-serif", color: "#fff", background: "#111", minHeight: "100vh" }, children: [_jsx("h2", { style: { marginTop: 0 }, children: "App failed to load" }), _jsx("p", { style: { color: "#fda4af" }, children: this.state.message }), _jsx("p", { style: { color: "#cbd5e1" }, children: "Open browser console and share the full error text." })] }));
        }
        return this.props.children;
    }
}
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(RootErrorBoundary, { children: _jsx(Suspense, { fallback: _jsx("div", { style: { padding: 24 }, children: "Loading POS..." }), children: _jsx(AppShell, {}) }) }) }));
