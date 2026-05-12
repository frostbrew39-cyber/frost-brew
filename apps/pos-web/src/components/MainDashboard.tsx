import { useEffect, useState } from "react";
import { apiUrl } from "../config";

export function MainDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const taxRate = Number(localStorage.getItem("zenpos_taxRate") || 10) / 100;

  useEffect(() => {
    const t = localStorage.getItem("zenpos_token");
    if (!t) return;
    fetch(apiUrl("/orders"), { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data : []));
  }, []);

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED').length;
  const inProgressOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'READY').length;

  const paymentsReceived = orders.filter(o => o.paymentMethod !== 'KHATA' && o.status !== 'CANCELLED').reduce((sum, o) => {
    return sum + (o.items || []).reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) * (1 + (o.taxRate ?? taxRate));
  }, 0);
  const paymentsPending = orders.filter(o => o.paymentMethod === 'KHATA' && o.status !== 'CANCELLED').reduce((sum, o) => {
    return sum + (o.items || []).reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) * (1 + (o.taxRate ?? taxRate));
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
       <h2 style={{ margin: 0 }}>Live Business Dashboard</h2>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', transition: 'transform 0.3s', cursor: 'default' }}>
            <h3 style={{ color: 'var(--text-muted)', margin: '0 0 16px 0', fontSize: '18px' }}>Total Orders Received</h3>
            <div style={{ fontSize: '56px', fontWeight: 800, color: 'var(--text-main)', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>{totalOrders}</div>
          </div>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', right: '-50%', bottom: '-50%', background: 'radial-gradient(circle, rgba(0,255,102,0.1) 0%, transparent 70%)', zIndex: 0 }} />
            <h3 style={{ color: 'var(--text-muted)', margin: '0 0 16px 0', fontSize: '18px', position: 'relative', zIndex: 1 }}>Orders Delivered</h3>
            <div style={{ fontSize: '56px', fontWeight: 800, color: 'var(--accent-green)', position: 'relative', zIndex: 1, textShadow: '0 0 20px rgba(0,255,102,0.4)' }}>{deliveredOrders}</div>
          </div>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', right: '-50%', bottom: '-50%', background: 'radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)', zIndex: 0 }} />
            <h3 style={{ color: 'var(--text-muted)', margin: '0 0 16px 0', fontSize: '18px', position: 'relative', zIndex: 1 }}>Orders In Progress</h3>
            <div style={{ fontSize: '56px', fontWeight: 800, color: 'var(--accent-blue)', position: 'relative', zIndex: 1, textShadow: '0 0 20px rgba(0,240,255,0.4)' }}>{inProgressOrders}</div>
          </div>
       </div>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)', margin: '0 0 16px 0', fontSize: '22px' }}>Payments Received (Cleared)</h3>
            <div className="gradient-text" style={{ fontSize: '64px', fontWeight: 800 }}>Rs {Math.round(paymentsReceived).toLocaleString()}</div>
          </div>
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)', margin: '0 0 16px 0', fontSize: '22px' }}>Payments Pending (Khata)</h3>
            <div style={{ fontSize: '64px', fontWeight: 800, color: 'var(--accent-pink)', textShadow: '0 0 30px rgba(255,0,127,0.4)' }}>Rs {Math.round(paymentsPending).toLocaleString()}</div>
          </div>
       </div>
    </div>
  );
}
