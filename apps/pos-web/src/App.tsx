import { useEffect, useMemo, useState } from "react";
import { OrderTimerBadge } from "./components/OrderTimerBadge";
import { API_V1_URL, createPosSocket } from "./config";

type Tab = "orders" | "billing" | "staff" | "delivery" | "analytics";
type OrderStatus = "PENDING" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED";

const API = API_V1_URL;
const socket = createPosSocket();

function shellStyle(active: boolean): React.CSSProperties {
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 18, padding: 16, background: "rgba(10,15,32,0.8)" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Array<{ id: number; orderNo: string; status: OrderStatus; placedAt: string; channel: string }>>([]);
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
    return data.token as string;
  }

  async function loadOrders(authToken: string) {
    const res = await fetch(`${API}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const data = await res.json();
    setOrders(data);
  }

  async function createDemoOrder() {
    if (!token) return;
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

  return (
    <div style={{ minHeight: "100vh", padding: 20, fontFamily: "Inter, Segoe UI, sans-serif", background: "radial-gradient(circle at top, #1a0035 0%, #050813 45%, #02040d 100%)", color: "#fff" }}>
      <h1 style={{ marginTop: 0, fontSize: 32, background: "linear-gradient(90deg,#ff00cc,#00e0ff,#a6ff00)", WebkitBackgroundClip: "text", color: "transparent" }}>
        Frost & Brew POS
      </h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button style={shellStyle(tab === "orders")} onClick={() => setTab("orders")}>Order Screen</button>
        <button style={shellStyle(tab === "billing")} onClick={() => setTab("billing")}>Billing</button>
        <button style={shellStyle(tab === "staff")} onClick={() => setTab("staff")}>Staff Management</button>
        <button style={shellStyle(tab === "delivery")} onClick={() => setTab("delivery")}>Delivery</button>
        <button style={shellStyle(tab === "analytics")} onClick={() => setTab("analytics")}>Analytics</button>
      </div>

      {tab === "orders" && (
        <SectionCard title="POS Order List (Live Timers)">
          <button onClick={createDemoOrder} style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,224,255,0.2)", color: "#dffbff" }}>
            + Create Demo Order
          </button>
          {orders.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div>
                <strong>{o.orderNo}</strong> • {o.channel}
              </div>
              <OrderTimerBadge placedAt={o.placedAt} status={o.status} />
            </div>
          ))}
        </SectionCard>
      )}

      {tab === "billing" && (
        <SectionCard title="Billing & Split Payments">
          <p>Supports: Cash, Card, Mobile Wallet, Khata/Credit</p>
          <div style={{ display: "grid", gap: 8 }}>
            <label>Split 1: CASH 600</label>
            <label>Split 2: CARD 450</label>
            <label>Tip: 100</label>
            <label>Total: 1150</label>
          </div>
        </SectionCard>
      )}

      {tab === "staff" && (
        <SectionCard title="Staff & HR Management">
          <ul>
            <li>Profiles with role, salary, shift, join date</li>
            <li>Attendance and overtime tracking</li>
            <li>Master admin block/unblock and role permission controls</li>
            <li>Activity logs by cashier/waiter/kitchen/admin</li>
          </ul>
        </SectionCard>
      )}

      {tab === "delivery" && (
        <SectionCard title="Delivery Console">
          <ul>
            <li>Rider assignment and status updates</li>
            <li>Customer addresses and zone-based charges</li>
            <li>Partner integration layer (Foodpanda/Careem/Uber Eats)</li>
          </ul>
        </SectionCard>
      )}

      {tab === "analytics" && (
        <SectionCard title="Analytics Dashboard">
          <p>Sales: {analytics.sales} | Profit: {analytics.profit}</p>
          <p>Avg Prep Time: {analytics.avgPrep} min</p>
          <p>Avg Delivery Time: {analytics.avgDelivery} min</p>
          <p>Custom date-filtered daily/weekly/monthly/yearly reports + receipt reprint logs.</p>
        </SectionCard>
      )}
    </div>
  );
}
