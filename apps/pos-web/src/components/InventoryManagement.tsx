import { useState, useEffect } from 'react';
import { apiUrl } from "../config";

export function InventoryManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch(apiUrl("/inventory"), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` }
      });
      const data = await res.json();
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'Ingredients', unit: 'pcs', alertAt: '10', purchasePrice: '0' });
  const [stockValue, setStockValue] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('zenpos_token');
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? apiUrl(`/inventory/${editingId}`) : apiUrl("/inventory");

    try {
      const payload = {
        ...formData,
        alertAt: Number(formData.alertAt) || 0,
        purchasePrice: Number(formData.purchasePrice) || 0
      };
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        alert("Error saving item: " + (error.message || "Unknown error"));
        return;
      }
      await fetchInventory();
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', category: 'Ingredients', unit: 'pcs', alertAt: '10', purchasePrice: '0' });
    } catch (e) {
      console.error(e);
      alert("Network error while saving item.");
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsUpdating(editingId);
    try {
      const res = await fetch(apiUrl(`/inventory/${editingId}`), {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` 
        },
        body: JSON.stringify({ currentStock: Number(stockValue) })
      });
      if (res.ok) {
        await fetchInventory();
        setIsStockModalOpen(false);
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

  const totalValuation = items.reduce((sum, item) => sum + (item.currentStock * (item.purchasePrice || 0)), 0);

  const exportCSV = () => {
    let csv = 'Item Name,Category,Current Stock,Unit,Alert At,Purchase Price,Total Value\n';
    items.forEach(item => {
      csv += `${item.name},${item.category},${item.currentStock},${item.unit},${item.alertAt},${item.purchasePrice},${item.currentStock * (item.purchasePrice || 0)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fb_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) return <div style={{ padding: '24px' }}>Loading inventory...</div>;

  return (
    <div className="printable-report" style={{ padding: '24px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
           <h2 style={{ margin: 0 }}>Inventory & Stock Management</h2>
           <div style={{ color: 'var(--accent-blue)', fontWeight: 700, marginTop: '4px' }}>Total Valuation: Rs {totalValuation.toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportCSV} className="rgb-button" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>Download CSV</button>
          <button onClick={() => window.print()} className="rgb-button" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>Print Report</button>
          <button onClick={() => { setEditingId(null); setFormData({ name: '', category: 'Ingredients', unit: 'pcs', alertAt: '10', purchasePrice: '0' }); setIsModalOpen(true); }} className="rgb-button filled" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>+ Add Item</button>
        </div>
      </div>

      {isStockModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleStockUpdate} style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <h3 style={{ margin: 0 }}>Update Stock Level</h3>
             <p style={{ color: 'var(--text-muted)', margin: 0 }}>Updating <strong>{items.find(i => i.id === editingId)?.name}</strong></p>
             <input autoFocus required type="number" value={stockValue} onChange={e => setStockValue(e.target.value)} style={{ width: '100%', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '20px', textAlign: 'center' }} />
             <div style={{ display: 'flex', gap: '12px' }}>
               <button type="button" onClick={() => setIsStockModalOpen(false)} className="rgb-button" style={{ flex: 1 }}>Cancel</button>
               <button type="submit" className="rgb-button filled" style={{ flex: 1 }} disabled={isUpdating !== null}>{isUpdating ? 'Saving...' : 'Update'}</button>
             </div>
          </form>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleSubmit} style={{ width: 'min(500px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingId ? "Edit Item" : "New Inventory Item"}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Item Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }}>
                  <option>Ingredients</option>
                  <option>Packaging</option>
                  <option>Kitchen Tools</option>
                  <option>Cleaning</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Unit</label>
                <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }}>
                  <option>pcs</option>
                  <option>kg</option>
                  <option>gram</option>
                  <option>liters</option>
                  <option>ml</option>
                  <option>box</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Alert Level (Notify when below)</label>
              <input required type="number" value={formData.alertAt} onChange={e => setFormData({...formData, alertAt: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Purchase Price (per unit in Rs)</label>
              <input required type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rgb-button" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button type="submit" className="rgb-button filled" style={{ flex: 1, padding: '12px' }}>{editingId ? "Save Changes" : "Add Item"}</button>
            </div>
          </form>
        </div>
      )}
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '12px 0' }}>Item Name</th>
            <th style={{ padding: '12px 0' }}>Category</th>
            <th style={{ padding: '12px 0' }}>Current Stock</th>
            <th style={{ padding: '12px 0' }}>Purchase Price</th>
            <th style={{ padding: '12px 0' }}>Total Value</th>
            <th className="no-print" style={{ padding: '12px 0', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '16px 0', fontWeight: 600 }}>{item.name}</td>
              <td style={{ padding: '16px 0' }}>{item.category}</td>
              <td style={{ padding: '16px 0' }}>
                <span style={{ color: item.currentStock <= item.alertAt ? 'var(--accent-pink)' : 'var(--accent-green)', fontWeight: 700 }}>
                  {item.currentStock} {item.unit}
                </span>
                {item.currentStock <= item.alertAt && <span style={{ fontSize: '10px', color: 'var(--accent-pink)', marginLeft: '8px' }}>Low!</span>}
              </td>
              <td style={{ padding: '16px 0', color: 'var(--text-muted)' }}>Rs {item.purchasePrice || 0}</td>
              <td style={{ padding: '16px 0', fontWeight: 'bold' }}>Rs {(item.currentStock * (item.purchasePrice || 0)).toLocaleString()}</td>
              <td className="no-print" style={{ padding: '16px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => { setEditingId(item.id); setStockValue(item.currentStock.toString()); setIsStockModalOpen(true); }} 
                  style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Update Stock
                </button>
                <button 
                  onClick={() => {
                    setEditingId(item.id);
                    setFormData({ name: item.name, category: item.category, unit: item.unit, alertAt: item.alertAt.toString(), purchasePrice: (item.purchasePrice || 0).toString() });
                    setIsModalOpen(true);
                  }} 
                  style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No inventory items found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
