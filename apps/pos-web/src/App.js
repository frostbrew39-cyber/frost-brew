import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { OrderTimerBadge } from "./components/OrderTimerBadge";
import { API_V1_URL, createPosSocket } from "./config";
const API = API_V1_URL;
const socket = createPosSocket();
function shellStyle(active) {
    return {
        border: "1px solid rgba(255,255,255,0.25)",
        color: active ? "#111" : "#f4f4f5",
        background: active ? "linear-gradient(90deg,#ff00cc,#00e0ff,#b3ff00)" : "rgba(255,255,255,0.05)",
        padding: "10px 14px",
        borderRadius: 12,
        fontWeight: 700,
        cursor: "pointer"
    };
}
function SectionCard({ title, children }) {
    return (_jsxs("section", { style: { border: "1px solid rgba(255,255,255,0.18)", borderRadius: 18, padding: 16, background: "rgba(10,15,32,0.8)" }, children: [_jsx("h3", { style: { marginTop: 0 }, children: title }), children] }));
}
export default function App() {
    const [tab, setTab] = useState("orders");
    const [orders, setOrders] = useState([]);
    const [token, setToken] = useState("");
    const analytics = useMemo(() => ({ sales: 28450, profit: 9490, avgPrep: 8.7, avgDelivery: 19.4 }), []);
    async function login() {
        const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: 2 })
        });
        const data = await res.json();
        setToken(data.token);
        return data.token;
    }
    async function loadOrders(authToken) {
        const res = await fetch(`${API}/orders`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();
        setOrders(data);
    }
    async function createDemoOrder() {
        if (!token)
            return;
        await fetch(`${API}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                channel: "DINE_IN",
                items: [{ menuItemId: 1, quantity: 2 }]
            })
        });
        await loadOrders(token);
    }
    useEffect(() => {
        login().then((t) => loadOrders(t));
    }, []);
    useEffect(() => {
        socket.on("order.created", (order) => {
            setOrders((prev) => [order, ...prev]);
        });
        socket.on("order.status.changed", (order) => {
            setOrders((prev) => prev.map((x) => (x.id === order.id ? order : x)));
        });
        return () => {
            socket.off("order.created");
            socket.off("order.status.changed");
        };
    }, []);
    return (_jsxs("div", { style: { minHeight: "100vh", padding: 20, fontFamily: "Inter, Segoe UI, sans-serif", background: "radial-gradient(circle at top, #1a0035 0%, #050813 45%, #02040d 100%)", color: "#fff" }, children: [_jsx("h1", { style: { marginTop: 0, fontSize: 32, background: "linear-gradient(90deg,#ff00cc,#00e0ff,#a6ff00)", WebkitBackgroundClip: "text", color: "transparent" }, children: "Frost & Brew POS" }), _jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }, children: [_jsx("button", { style: shellStyle(tab === "orders"), onClick: () => setTab("orders"), children: "Order Screen" }), _jsx("button", { style: shellStyle(tab === "billing"), onClick: () => setTab("billing"), children: "Billing" }), _jsx("button", { style: shellStyle(tab === "staff"), onClick: () => setTab("staff"), children: "Staff Management" }), _jsx("button", { style: shellStyle(tab === "delivery"), onClick: () => setTab("delivery"), children: "Delivery" }), _jsx("button", { style: shellStyle(tab === "analytics"), onClick: () => setTab("analytics"), children: "Analytics" })] }), tab === "orders" && (_jsxs(SectionCard, { title: "POS Order List (Live Timers)", children: [_jsx("button", { onClick: createDemoOrder, style: { marginBottom: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,224,255,0.2)", color: "#dffbff" }, children: "+ Create Demo Order" }), orders.map((o) => (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }, children: [_jsxs("div", { children: [_jsx("strong", { children: o.orderNo }), " \u2022 ", o.channel] }), _jsx(OrderTimerBadge, { placedAt: o.placedAt, status: o.status })] }, o.id)))] })), tab === "billing" && (_jsxs(SectionCard, { title: "Billing & Split Payments", children: [_jsx("p", { children: "Supports: Cash, Card, Mobile Wallet, Khata/Credit" }), _jsxs("div", { style: { display: "grid", gap: 8 }, children: [_jsx("label", { children: "Split 1: CASH 600" }), _jsx("label", { children: "Split 2: CARD 450" }), _jsx("label", { children: "Tip: 100" }), _jsx("label", { children: "Total: 1150" })] })] })), tab === "staff" && (_jsx(SectionCard, { title: "Staff & HR Management", children: _jsxs("ul", { children: [_jsx("li", { children: "Profiles with role, salary, shift, join date" }), _jsx("li", { children: "Attendance and overtime tracking" }), _jsx("li", { children: "Master admin block/unblock and role permission controls" }), _jsx("li", { children: "Activity logs by cashier/waiter/kitchen/admin" })] }) })), tab === "delivery" && (_jsx(SectionCard, { title: "Delivery Console", children: _jsxs("ul", { children: [_jsx("li", { children: "Rider assignment and status updates" }), _jsx("li", { children: "Customer addresses and zone-based charges" }), _jsx("li", { children: "Partner integration layer (Foodpanda/Careem/Uber Eats)" })] }) })), tab === "analytics" && (_jsxs(SectionCard, { title: "Analytics Dashboard", children: [_jsxs("p", { children: ["Sales: ", analytics.sales, " | Profit: ", analytics.profit] }), _jsxs("p", { children: ["Avg Prep Time: ", analytics.avgPrep, " min"] }), _jsxs("p", { children: ["Avg Delivery Time: ", analytics.avgDelivery, " min"] }), _jsx("p", { children: "Custom date-filtered daily/weekly/monthly/yearly reports + receipt reprint logs." })] }))] }));
}
