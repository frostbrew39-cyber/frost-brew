import { useEffect, useState } from "react";
import { apiUrl } from "../config";

export function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{fullName: string, username: string, role: string, salaryMonthly: string, joinDate: string, password: string, permissions: string[] | null}>({ fullName: '', username: '', role: 'CASHIER', salaryMonthly: '', joinDate: '', password: '', permissions: null });
  const [token, setToken] = useState("");
  const [salaryModalStaff, setSalaryModalStaff] = useState<any | null>(null);

  useEffect(() => {
    const activeToken = localStorage.getItem('zenpos_token');
    const userRole = localStorage.getItem('zenpos_role'); // Assuming we store role in localStorage
    if (!activeToken) return;
    setToken(activeToken);
    
    fetch(apiUrl("/staff"), {
      headers: { "Authorization": `Bearer ${activeToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setStaff(data);
      else setStaff([{ id: 1, fullName: "Master Admin", role: "MASTER_ADMIN", blocked: false, joinDate: "2024-01-01", salaryMonthly: 80000 }]);
    })
    .catch(err => console.error(err));
  }, []);

  const userRole = localStorage.getItem('zenpos_role');
  const isAdmin = userRole === 'MASTER_ADMIN' || userRole === 'ADMIN';

  const handleAdd = () => isAdmin && setIsModalOpen(true);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (editingId) {
      const res = await fetch(apiUrl(`/staff/${editingId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Failed to update: " + JSON.stringify(err));
        return;
      }
      setStaff(staff.map(s => s.id === editingId ? { ...s, fullName: formData.fullName, role: formData.role, salaryMonthly: Number(formData.salaryMonthly), joinDate: formData.joinDate, username: formData.username, permissions: formData.permissions } : s));
    } else {
      const res = await fetch(apiUrl("/staff"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert("Failed to add: " + JSON.stringify(data.message || data));
        return;
      }
      if (data.success) {
        setStaff([...staff, { ...data.staff, salaryMonthly: Number(formData.salaryMonthly), joinDate: formData.joinDate, permissions: formData.permissions }]);
      }
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ fullName: '', username: '', role: 'CASHIER', salaryMonthly: '', joinDate: '', password: '', permissions: null });
  };

  const toggleBlock = (id: number) => {
    setStaff(staff.map(s => s.id === id ? { ...s, blocked: !s.blocked } : s));
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Staff Roster</h2>
        {isAdmin && <button onClick={handleAdd} className="rgb-button" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>+ Add Staff</button>}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleSubmit} style={{ width: 'min(600px, 94vw)', padding: 'clamp(16px, 4vw, 32px)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingId ? "Edit Staff Member" : "New Staff Member"}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Full Name</label>
                <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Username</label>
                <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }}>
                  <option value="CASHIER">Cashier</option>
                  <option value="WAITER">Waiter / Order taker</option>
                  <option value="KITCHEN">Kitchen Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="DELIVERY">Delivery Rider</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Monthly Salary (Rs)</label>
                <input required type="number" value={formData.salaryMonthly} onChange={e => setFormData({...formData, salaryMonthly: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Password</label>
                <input required={!editingId} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingId ? "Leave blank to keep current" : "Enter password"} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Join Date</label>
                <input required type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '8px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>Custom Page Access</label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>By default, staff get standard access based on their Role. If you check any boxes below, they will ONLY have access to the pages you select.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: "dashboard", label: "Dashboard" }, { id: "tables", label: "Tables" }, { id: "pos", label: "POS / Order taking" }, { id: "orders", label: "Live Orders" },
                  { id: "kds", label: "Kitchen Display" }, { id: "menu", label: "Menu Editor" }, { id: "inventory", label: "Inventory" },
                  { id: "delivery", label: "Delivery" }, { id: "customers", label: "Customers/Khata" }, { id: "attendance", label: "Attendance" },
                  { id: "analytics", label: "Analytics" }, { id: "staff", label: "Staff HR" }, { id: "settings", label: "Settings" }
                ].map(page => (
                   <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main)', cursor: 'pointer' }}>
                     <input 
                        type="checkbox" 
                        checked={formData.permissions?.includes(page.id) || false} 
                        onChange={(e) => {
                          const current = formData.permissions || [];
                          if (e.target.checked) setFormData({ ...formData, permissions: [...current, page.id] });
                          else setFormData({ ...formData, permissions: current.length === 1 ? null : current.filter(p => p !== page.id) });
                        }} 
                     />
                     {page.label}
                   </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rgb-button" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button type="submit" className="rgb-button filled" style={{ flex: 1, padding: '12px' }}>{editingId ? "Save Changes" : "Add Staff"}</button>
            </div>
          </form>
        </div>
      )}

      {salaryModalStaff && (
        <SalaryModal staff={salaryModalStaff} token={token} onClose={() => setSalaryModalStaff(null)} />
      )}
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '12px 0' }}>Name / Username</th>
            <th style={{ padding: '12px 0' }}>Role</th>
            <th style={{ padding: '12px 0' }}>Salary</th>
            <th style={{ padding: '12px 0' }}>Joined</th>
            <th style={{ padding: '12px 0' }}>Access</th>
            {isAdmin && <th style={{ padding: '12px 0', textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {staff?.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '16px 0' }}>
                <div style={{ fontWeight: 600 }}>{s.fullName || s.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{s.username || 'unknown'}</div>
              </td>
              <td style={{ padding: '16px 0' }}>
                {s.role === "WAITER" ? "Waiter / Order taker" : s.role === "CASHIER" ? "Cashier" : s.role === "KITCHEN" ? "Kitchen" : s.role === "MANAGER" ? "Manager" : s.role === "DELIVERY" ? "Delivery" : s.role}
              </td>
              <td style={{ padding: '16px 0' }}>Rs {s.salaryMonthly || 45000}</td>
              <td style={{ padding: '16px 0' }}>{s.joinDate || "2024-01-15"}</td>
              <td style={{ padding: '16px 0' }}>
                <span style={{ 
                  color: s.blocked ? '#ff007f' : '#00ff66',
                  background: s.blocked ? 'rgba(255,0,127,0.1)' : 'rgba(0,255,102,0.1)',
                  padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {s.blocked ? 'Blocked' : 'Active'}
                </span>
              </td>
              {isAdmin && (
                <td style={{ padding: '16px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {s.role !== 'MASTER_ADMIN' ? (
                    <>
                      <button onClick={() => setSalaryModalStaff(s)} style={{ background: 'transparent', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>Salary</button>
                      <button onClick={() => { setEditingId(s.id); setFormData({ fullName: s.fullName || s.name, username: s.username || '', role: s.role, salaryMonthly: s.salaryMonthly?.toString() || '45000', joinDate: s.joinDate || '2024-01-15', password: '', permissions: s.permissions || null }); setIsModalOpen(true); }} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
                      {userRole === 'MASTER_ADMIN' && (
                        <button onClick={() => toggleBlock(s.id)} style={{ background: s.blocked ? 'rgba(0,255,102,0.2)' : 'rgba(255,0,127,0.2)', border: '1px solid transparent', color: s.blocked ? '#00ff66' : '#ff007f', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                          {s.blocked ? "Unblock" : "Revoke Access"}
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 12px' }}>Protected</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SalaryModal({ staff, token, onClose }: { staff: any, token: string, onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'PAYMENT', amount: '', notes: '' });

  useEffect(() => {
    fetch(apiUrl(`/staff/${staff.id}/salary`), { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setLogs(data || []));
  }, [staff.id, token]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch(apiUrl(`/staff/${staff.id}/salary`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const data = await res.json();
      setLogs([...logs, data.log]);
      setForm({ ...form, amount: '', notes: '' });
      if (form.type === 'RAISE') {
         staff.salaryMonthly = (staff.salaryMonthly || 0) + Number(form.amount);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: 'min(700px, 96vw)', padding: 'clamp(16px, 4vw, 32px)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--accent-blue)' }}>Salary History: {staff.fullName}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Base Monthly Salary: <strong style={{ color: '#fff' }}>Rs {staff.salaryMonthly || 45000}</strong></div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr auto', gap: '8px', alignItems: 'end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date</label>
            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }}>
              <option value="PAYMENT">Pay Salary</option>
              <option value="ADVANCE">Advance Pay</option>
              <option value="RAISE">Give Raise (+ Base)</option>
              <option value="DEDUCTION">Deduction / Fine</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount</label>
            <input type="number" required min="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Notes (Optional)</label>
            <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="e.g. November Pay" style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }} />
          </div>
          <button type="submit" className="rgb-button filled" style={{ padding: '8px 16px', height: '35px' }}>Log</button>
        </form>

        <div style={{ flex: 1, borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                <th style={{ padding: '8px 0' }}>Date</th>
                <th style={{ padding: '8px 0' }}>Transaction Type</th>
                <th style={{ padding: '8px 0' }}>Amount</th>
                <th style={{ padding: '8px 0' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No salary logs recorded yet.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 0' }}>{log.date}</td>
                    <td style={{ padding: '12px 0' }}>
                      <span style={{ 
                        color: log.type === 'RAISE' ? '#00ff66' : log.type === 'DEDUCTION' ? '#ff007f' : log.type === 'ADVANCE' ? '#ffc800' : '#00f0ff',
                        background: log.type === 'RAISE' ? 'rgba(0,255,102,0.1)' : log.type === 'DEDUCTION' ? 'rgba(255,0,127,0.1)' : log.type === 'ADVANCE' ? 'rgba(255,200,0,0.1)' : 'rgba(0,240,255,0.1)',
                        padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'
                      }}>
                        {log.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Rs {log.amount}</td>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{log.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
