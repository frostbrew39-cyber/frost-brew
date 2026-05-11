import { useEffect, useState } from "react";
import { apiUrl } from "../config";

export function DeliveryConsole({ orders, onUpdateStatus }: { orders: any[], onUpdateStatus: (id: number, status: string) => void }) {
  const [riders, setRiders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      const res = await fetch(apiUrl("/delivery/riders"), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` }
      });
      const data = await res.json();
      setRiders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', payRate: '', type: 'Per Delivery' });
  const [deliveriesValue, setDeliveriesValue] = useState('0');
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const deliveryOrders = orders.filter((o: any) => o.channel === "DELIVERY" || o.status === "OUT_FOR_DELIVERY" || o.status === "FAILED_DELIVERY");

  const handleAddRider = async (e: any) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        payRate: Number(formData.payRate) || 0
      };
      const res = await fetch(apiUrl("/delivery/riders"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        alert("Failed to add rider: " + (error.message || "Unknown error"));
        return;
      }
      await fetchRiders();
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', payRate: '', type: 'Per Delivery' });
    } catch (e) {
      console.error(e);
      alert("Network error while adding rider.");
    }
  };

  const handleDeliveriesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsUpdating(editingId);
    try {
      const res = await fetch(apiUrl(`/delivery/riders/${editingId}`), {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` 
        },
        body: JSON.stringify({ deliveriesDone: Number(deliveriesValue) })
      });
      if (res.ok) {
        await fetchRiders();
        setIsDeliveriesModalOpen(false);
      } else {
        const err = await res.json();
        alert("Failed: " + (err.message || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}>Loading delivery console...</div>;

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ margin: 0, marginBottom: '24px' }}>Delivery & Partner Dispatch</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {deliveryOrders.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active delivery orders.</p>}
        {deliveryOrders.map(d => (
          <div key={d.id} className="glass-panel" style={{ padding: '16px', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: d.status === 'FAILED_DELIVERY' ? '4px solid var(--accent-pink)' : 'none' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{d.orderNo} <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>via {d.partner || "Internal Rider"}</span></div>
              <div style={{ color: 'var(--text-main)', marginBottom: '4px' }}>{d.customerName || "Customer #"+d.customerId}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{d.customerPhone} | {d.customerAddress || "Pending Address"}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                color: d.status === 'OUT_FOR_DELIVERY' ? 'var(--accent-blue)' : d.status === 'FAILED_DELIVERY' ? 'var(--accent-pink)' : 'var(--accent-green)',
                fontWeight: 600,
                padding: '4px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                {d.status.replace(/_/g, ' ')}
              </span>
              
              {d.status !== 'COMPLETED' && d.status !== 'FAILED_DELIVERY' && (
                <>
                  <button onClick={() => onUpdateStatus(d.id, "COMPLETED")} className="rgb-button filled" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto' }}>Delivered</button>
                  <button onClick={() => onUpdateStatus(d.id, "FAILED_DELIVERY")} className="rgb-button" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto', color: 'var(--accent-pink)' }}>Failed</button>
                </>
              )}
              
              {d.status === 'PENDING' && (
                <button className="rgb-button" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto' }}>Assign Rider</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Rider Performance & Reports</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ color: 'var(--text-muted)' }}>From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
          <label style={{ color: 'var(--text-muted)' }}>To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
          <button onClick={() => setIsModalOpen(true)} className="rgb-button" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto', marginLeft: '8px' }}>+ Add Rider</button>
        </div>
      </div>

      {isDeliveriesModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleDeliveriesUpdate} style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <h3 style={{ margin: 0 }}>Update Delivery Count</h3>
             <p style={{ color: 'var(--text-muted)', margin: 0 }}>Updating <strong>{riders.find(r => r.id === editingId)?.name}</strong></p>
             <input autoFocus required type="number" value={deliveriesValue} onChange={e => setDeliveriesValue(e.target.value)} style={{ width: '100%', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '20px', textAlign: 'center' }} />
             <div style={{ display: 'flex', gap: '12px' }}>
               <button type="button" onClick={() => setIsDeliveriesModalOpen(false)} className="rgb-button" style={{ flex: 1 }}>Cancel</button>
               <button type="submit" className="rgb-button filled" style={{ flex: 1 }} disabled={isUpdating !== null}>{isUpdating ? 'Saving...' : 'Update'}</button>
             </div>
          </form>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleAddRider} style={{ width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>New Delivery Rider</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Phone Number</label>
              <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Pay Rate (Rs)</label>
                <input required type="number" value={formData.payRate} onChange={e => setFormData({...formData, payRate: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Rate Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }}>
                  <option>Per Delivery</option>
                  <option>Fixed Monthly</option>
                  <option>Commission %</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rgb-button" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button type="submit" className="rgb-button filled" style={{ flex: 1, padding: '12px' }}>Save Rider</button>
            </div>
          </form>
        </div>
      )}

      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '12px 0' }}>Rider Name</th>
            <th style={{ padding: '12px 0' }}>Phone</th>
            <th style={{ padding: '12px 0' }}>Pay Rate</th>
            <th style={{ padding: '12px 0', textAlign: 'center' }}>Deliveries (Selected Dates)</th>
            <th style={{ padding: '12px 0', textAlign: 'right' }}>Calculated Pay</th>
          </tr>
        </thead>
        <tbody>
          {riders.map(r => {
            return (
            <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '16px 0', fontWeight: 600 }}>{r.name}</td>
              <td style={{ padding: '16px 0', color: 'var(--text-muted)' }}>{r.phone}</td>
              <td style={{ padding: '16px 0', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                Rs {r.payRate} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>{r.type}</span>
              </td>
              <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: 'bold' }}>
                {r.deliveriesDone} <button onClick={() => { setEditingId(r.id); setDeliveriesValue(r.deliveriesDone.toString()); setIsDeliveriesModalOpen(true); }} style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', border: 'none', background: 'var(--accent-blue)', color: '#fff', borderRadius: '4px' }}>Edit</button>
              </td>
              <td style={{ padding: '16px 0', textAlign: 'right', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                Rs {r.type === 'Per Delivery' ? r.payRate * r.deliveriesDone : r.payRate}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
}
