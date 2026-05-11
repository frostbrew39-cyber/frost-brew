import { useState, useEffect } from 'react';
import { apiUrl } from "../config";

export function CustomerManagement() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ fullName: '', phone: '', address: '' });
  const [token, setToken] = useState("");

  const loadCustomers = (t: string) => {
    fetch(apiUrl("/customers"), { headers: { "Authorization": `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => setCustomers(data))
      .catch(console.error);
  };

  useEffect(() => {
    const t = localStorage.getItem('zenpos_token');
    if (t) {
      setToken(t);
      loadCustomers(t);
    }
  }, []);

  const handleAdd = () => setIsModalOpen(true);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await fetch(apiUrl("/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      loadCustomers(token);
      setIsModalOpen(false);
      setFormData({ fullName: '', phone: '', address: '' });
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Customer Directory (Khata & Loyalty)</h2>
        <button onClick={handleAdd} className="rgb-button" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>+ Add Customer</button>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleSubmit} style={{ width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>New Customer</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Name</label>
              <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Phone Number</label>
              <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Delivery Address</label>
              <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none', resize: 'vertical' }} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rgb-button" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button type="submit" className="rgb-button filled" style={{ flex: 1, padding: '12px' }}>Save Customer</button>
            </div>
          </form>
        </div>
      )}

      {selectedCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>Customer Profile</h3>
            <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <strong style={{ float: 'right' }}>{selectedCustomer.fullName}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong style={{ float: 'right' }}>{selectedCustomer.phone}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> <strong style={{ float: 'right', textAlign: 'right', maxWidth: '200px' }}>{selectedCustomer.address || "N/A"}</strong></div>
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Loyalty Points:</span> <strong style={{ float: 'right', color: 'var(--accent-blue)' }}>{selectedCustomer.loyaltyPoints}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Khata Balance:</span> <strong style={{ float: 'right', color: selectedCustomer.khataBalance > 0 ? 'var(--accent-pink)' : '#fff' }}>Rs {selectedCustomer.khataBalance}</strong>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="rgb-button filled" style={{ marginTop: '24px' }}>Close Profile</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '12px 0' }}>Customer Name</th>
            <th style={{ padding: '12px 0' }}>Phone</th>
            <th style={{ padding: '12px 0' }}>Address</th>
            <th style={{ padding: '12px 0' }}>Khata Balance</th>
            <th style={{ padding: '12px 0' }}>Loyalty Points</th>
            <th style={{ padding: '12px 0', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '16px 0', fontWeight: 600 }}>{c.fullName}</td>
              <td style={{ padding: '16px 0', color: 'var(--text-muted)' }}>{c.phone}</td>
              <td style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</td>
              <td style={{ padding: '16px 0', color: c.khataBalance > 0 ? 'var(--accent-pink)' : 'var(--text-main)' }}>
                Rs {c.khataBalance}
              </td>
              <td style={{ padding: '16px 0', color: 'var(--accent-blue)', fontWeight: 'bold' }}>{c.loyaltyPoints} pts</td>
              <td style={{ padding: '16px 0', textAlign: 'right' }}>
                <button onClick={() => setSelectedCustomer(c)} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>View Details</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
