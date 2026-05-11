import { useMemo } from "react";

const orders = [
  { id: 1, token: "FB-1001", status: "PENDING", items: ["2x Zinger Combo", "1x Fries"] },
  { id: 2, token: "FB-1002", status: "PREPARING", items: ["1x Beef Burger", "2x Cola"] },
  { id: 3, token: "FB-1003", status: "READY", items: ["3x Crispy Wrap"] }
];

const statusStyle: Record<string, React.CSSProperties> = {
  PENDING: { borderColor: "#ffcc00", background: "rgba(255,204,0,0.15)" },
  PREPARING: { borderColor: "#00d5ff", background: "rgba(0,213,255,0.15)" },
  READY: { borderColor: "#26ff9a", background: "rgba(38,255,154,0.15)" },
  OUT_FOR_DELIVERY: { borderColor: "#c87bff", background: "rgba(200,123,255,0.15)" },
  COMPLETED: { borderColor: "#999", background: "rgba(153,153,153,0.15)" }
};

export default function App() {
  const count = useMemo(() => orders.length, []);
  return (
    <main style={{ minHeight: "100vh", background: "#080d1a", color: "#fff", padding: 20, fontFamily: "Inter, Segoe UI, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Kitchen Display System</h1>
      <p>Live Queue: {count} orders</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {orders.map((order) => (
          <article
            key={order.id}
            style={{
              border: "2px solid",
              borderRadius: 14,
              padding: 12,
              ...(statusStyle[order.status] ?? statusStyle.PENDING)
            }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>#{order.token}</strong>
              <span>{order.status}</span>
            </header>
            <ul style={{ margin: 0 }}>
              {order.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
