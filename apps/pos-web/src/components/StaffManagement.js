import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { apiUrl } from "../config";
export function StaffManagement() {
    const [staff, setStaff] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ fullName: '', username: '', role: 'CASHIER', salaryMonthly: '', joinDate: '', password: '', permissions: null });
    const [token, setToken] = useState("");
    const [salaryModalStaff, setSalaryModalStaff] = useState(null);
    useEffect(() => {
        const activeToken = localStorage.getItem('zenpos_token');
        const userRole = localStorage.getItem('zenpos_role'); // Assuming we store role in localStorage
        if (!activeToken)
            return;
        setToken(activeToken);
        fetch(apiUrl("/staff"), {
            headers: { "Authorization": `Bearer ${activeToken}` }
        })
            .then(res => res.json())
            .then(data => {
            if (Array.isArray(data))
                setStaff(data);
            else
                setStaff([{ id: 1, fullName: "Master Admin", role: "MASTER_ADMIN", blocked: false, joinDate: "2024-01-01", salaryMonthly: 80000 }]);
        })
            .catch(err => console.error(err));
    }, []);
    const userRole = localStorage.getItem('zenpos_role');
    const isAdmin = userRole === 'MASTER_ADMIN' || userRole === 'ADMIN';
    const handleAdd = () => isAdmin && setIsModalOpen(true);
    const handleSubmit = async (e) => {
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
        }
        else {
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
    const toggleBlock = (id) => {
        setStaff(staff.map(s => s.id === id ? { ...s, blocked: !s.blocked } : s));
    };
    return (_jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }, children: [_jsx("h2", { style: { margin: 0 }, children: "Staff Roster" }), isAdmin && _jsx("button", { onClick: handleAdd, className: "rgb-button", style: { padding: '8px 16px', fontSize: '14px', width: 'auto' }, children: "+ Add Staff" })] }), isModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleSubmit, style: { width: 'min(600px, 94vw)', padding: 'clamp(16px, 4vw, 32px)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: editingId ? "Edit Staff Member" : "New Staff Member" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Full Name" }), _jsx("input", { required: true, value: formData.fullName, onChange: e => setFormData({ ...formData, fullName: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Username" }), _jsx("input", { required: true, value: formData.username, onChange: e => setFormData({ ...formData, username: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Role" }), _jsxs("select", { value: formData.role, onChange: e => setFormData({ ...formData, role: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }, children: [_jsx("option", { value: "CASHIER", children: "Cashier" }), _jsx("option", { value: "WAITER", children: "Waiter / Order taker" }), _jsx("option", { value: "KITCHEN", children: "Kitchen Staff" }), _jsx("option", { value: "MANAGER", children: "Manager" }), _jsx("option", { value: "DELIVERY", children: "Delivery Rider" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Monthly Salary (Rs)" }), _jsx("input", { required: true, type: "number", value: formData.salaryMonthly, onChange: e => setFormData({ ...formData, salaryMonthly: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Password" }), _jsx("input", { required: !editingId, type: "password", value: formData.password, onChange: e => setFormData({ ...formData, password: e.target.value }), placeholder: editingId ? "Leave blank to keep current" : "Enter password", style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Join Date" }), _jsx("input", { required: true, type: "date", value: formData.joinDate, onChange: e => setFormData({ ...formData, joinDate: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] })] }), _jsxs("div", { style: { borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '8px' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '12px', color: 'var(--accent-blue)', fontWeight: 'bold' }, children: "Custom Page Access" }), _jsx("p", { style: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }, children: "By default, staff get standard access based on their Role. If you check any boxes below, they will ONLY have access to the pages you select." }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, children: [
                                        { id: "dashboard", label: "Dashboard" }, { id: "tables", label: "Tables" }, { id: "pos", label: "POS / Order taking" }, { id: "orders", label: "Live Orders" },
                                        { id: "kds", label: "Kitchen Display" }, { id: "menu", label: "Menu Editor" }, { id: "inventory", label: "Inventory" },
                                        { id: "delivery", label: "Delivery" }, { id: "customers", label: "Customers/Khata" }, { id: "attendance", label: "Attendance" },
                                        { id: "analytics", label: "Analytics" }, { id: "staff", label: "Staff HR" }, { id: "settings", label: "Settings" }
                                    ].map(page => (_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main)', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: formData.permissions?.includes(page.id) || false, onChange: (e) => {
                                                    const current = formData.permissions || [];
                                                    if (e.target.checked)
                                                        setFormData({ ...formData, permissions: [...current, page.id] });
                                                    else
                                                        setFormData({ ...formData, permissions: current.length === 1 ? null : current.filter(p => p !== page.id) });
                                                } }), page.label] }, page.id))) })] }), _jsxs("div", { style: { display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "rgb-button", style: { flex: 1, padding: '12px' }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1, padding: '12px' }, children: editingId ? "Save Changes" : "Add Staff" })] })] }) })), salaryModalStaff && (_jsx(SalaryModal, { staff: salaryModalStaff, token: token, onClose: () => setSalaryModalStaff(null) })), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }, children: [_jsx("th", { style: { padding: '12px 0' }, children: "Name / Username" }), _jsx("th", { style: { padding: '12px 0' }, children: "Role" }), _jsx("th", { style: { padding: '12px 0' }, children: "Salary" }), _jsx("th", { style: { padding: '12px 0' }, children: "Joined" }), _jsx("th", { style: { padding: '12px 0' }, children: "Access" }), isAdmin && _jsx("th", { style: { padding: '12px 0', textAlign: 'right' }, children: "Actions" })] }) }), _jsx("tbody", { children: staff?.map(s => (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, children: [_jsxs("td", { style: { padding: '16px 0' }, children: [_jsx("div", { style: { fontWeight: 600 }, children: s.fullName || s.name }), _jsxs("div", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: ["@", s.username || 'unknown'] })] }), _jsx("td", { style: { padding: '16px 0' }, children: s.role === "WAITER" ? "Waiter / Order taker" : s.role === "CASHIER" ? "Cashier" : s.role === "KITCHEN" ? "Kitchen" : s.role === "MANAGER" ? "Manager" : s.role === "DELIVERY" ? "Delivery" : s.role }), _jsxs("td", { style: { padding: '16px 0' }, children: ["Rs ", s.salaryMonthly || 45000] }), _jsx("td", { style: { padding: '16px 0' }, children: s.joinDate || "2024-01-15" }), _jsx("td", { style: { padding: '16px 0' }, children: _jsx("span", { style: {
                                            color: s.blocked ? '#ff007f' : '#00ff66',
                                            background: s.blocked ? 'rgba(255,0,127,0.1)' : 'rgba(0,255,102,0.1)',
                                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
                                            fontWeight: 'bold'
                                        }, children: s.blocked ? 'Blocked' : 'Active' }) }), isAdmin && (_jsx("td", { style: { padding: '16px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }, children: s.role !== 'MASTER_ADMIN' ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setSalaryModalStaff(s), style: { background: 'transparent', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "Salary" }), _jsx("button", { onClick: () => { setEditingId(s.id); setFormData({ fullName: s.fullName || s.name, username: s.username || '', role: s.role, salaryMonthly: s.salaryMonthly?.toString() || '45000', joinDate: s.joinDate || '2024-01-15', password: '', permissions: s.permissions || null }); setIsModalOpen(true); }, style: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "Edit" }), userRole === 'MASTER_ADMIN' && (_jsx("button", { onClick: () => toggleBlock(s.id), style: { background: s.blocked ? 'rgba(0,255,102,0.2)' : 'rgba(255,0,127,0.2)', border: '1px solid transparent', color: s.blocked ? '#00ff66' : '#ff007f', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: s.blocked ? "Unblock" : "Revoke Access" }))] })) : (_jsx("span", { style: { color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 12px' }, children: "Protected" })) }))] }, s.id))) })] })] }));
}
function SalaryModal({ staff, token, onClose }) {
    const [logs, setLogs] = useState([]);
    const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'PAYMENT', amount: '', notes: '' });
    useEffect(() => {
        fetch(apiUrl(`/staff/${staff.id}/salary`), { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setLogs(data || []));
    }, [staff.id, token]);
    const handleSubmit = async (e) => {
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
    return (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("div", { className: "glass-panel", style: { width: 'min(700px, 96vw)', padding: 'clamp(16px, 4vw, 32px)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsxs("h3", { style: { margin: 0, color: 'var(--accent-blue)' }, children: ["Salary History: ", staff.fullName] }), _jsxs("div", { style: { color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }, children: ["Base Monthly Salary: ", _jsxs("strong", { style: { color: '#fff' }, children: ["Rs ", staff.salaryMonthly || 45000] })] })] }), _jsx("button", { onClick: onClose, style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }, children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleSubmit, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr auto', gap: '8px', alignItems: 'end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Date" }), _jsx("input", { type: "date", required: true, value: form.date, onChange: e => setForm({ ...form, date: e.target.value }), style: { width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Type" }), _jsxs("select", { value: form.type, onChange: e => setForm({ ...form, type: e.target.value }), style: { width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }, children: [_jsx("option", { value: "PAYMENT", children: "Pay Salary" }), _jsx("option", { value: "ADVANCE", children: "Advance Pay" }), _jsx("option", { value: "RAISE", children: "Give Raise (+ Base)" }), _jsx("option", { value: "DEDUCTION", children: "Deduction / Fine" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Amount" }), _jsx("input", { type: "number", required: true, min: "1", value: form.amount, onChange: e => setForm({ ...form, amount: e.target.value }), style: { width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Notes (Optional)" }), _jsx("input", { type: "text", value: form.notes, onChange: e => setForm({ ...form, notes: e.target.value }), placeholder: "e.g. November Pay", style: { width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' } })] }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { padding: '8px 16px', height: '35px' }, children: "Log" })] }), _jsx("div", { style: { flex: 1, borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }, children: _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { color: 'var(--text-muted)', fontSize: '14px' }, children: [_jsx("th", { style: { padding: '8px 0' }, children: "Date" }), _jsx("th", { style: { padding: '8px 0' }, children: "Transaction Type" }), _jsx("th", { style: { padding: '8px 0' }, children: "Amount" }), _jsx("th", { style: { padding: '8px 0' }, children: "Notes" })] }) }), _jsx("tbody", { children: logs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, style: { padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }, children: "No salary logs recorded yet." }) })) : (logs.map(log => (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, children: [_jsx("td", { style: { padding: '12px 0' }, children: log.date }), _jsx("td", { style: { padding: '12px 0' }, children: _jsx("span", { style: {
                                                    color: log.type === 'RAISE' ? '#00ff66' : log.type === 'DEDUCTION' ? '#ff007f' : log.type === 'ADVANCE' ? '#ffc800' : '#00f0ff',
                                                    background: log.type === 'RAISE' ? 'rgba(0,255,102,0.1)' : log.type === 'DEDUCTION' ? 'rgba(255,0,127,0.1)' : log.type === 'ADVANCE' ? 'rgba(255,200,0,0.1)' : 'rgba(0,240,255,0.1)',
                                                    padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'
                                                }, children: log.type }) }), _jsxs("td", { style: { padding: '12px 0', fontWeight: 'bold' }, children: ["Rs ", log.amount] }), _jsx("td", { style: { padding: '12px 0', color: 'var(--text-muted)' }, children: log.notes || '-' })] }, log.id)))) })] }) })] }) }));
}
