import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { apiUrl } from "../config";
export function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({ fullName: '', phone: '', address: '' });
    const [token, setToken] = useState("");
    const loadCustomers = (t) => {
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
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            console.error(err);
        }
    };
    return (_jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }, children: [_jsx("h2", { style: { margin: 0 }, children: "Customer Directory (Khata & Loyalty)" }), _jsx("button", { onClick: handleAdd, className: "rgb-button", style: { padding: '8px 16px', fontSize: '14px', width: 'auto' }, children: "+ Add Customer" })] }), isModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleSubmit, style: { width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: "New Customer" }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Name" }), _jsx("input", { required: true, value: formData.fullName, onChange: e => setFormData({ ...formData, fullName: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Phone Number" }), _jsx("input", { required: true, value: formData.phone, onChange: e => setFormData({ ...formData, phone: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Delivery Address" }), _jsx("textarea", { required: true, value: formData.address, onChange: e => setFormData({ ...formData, address: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none', resize: 'vertical' }, rows: 2 })] }), _jsxs("div", { style: { display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "rgb-button", style: { flex: 1, padding: '12px' }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1, padding: '12px' }, children: "Save Customer" })] })] }) })), selectedCustomer && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("div", { className: "glass-panel", style: { width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }, children: "Customer Profile" }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: "Name:" }), " ", _jsx("strong", { style: { float: 'right' }, children: selectedCustomer.fullName })] }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: "Phone:" }), " ", _jsx("strong", { style: { float: 'right' }, children: selectedCustomer.phone })] }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: "Address:" }), " ", _jsx("strong", { style: { float: 'right', textAlign: 'right', maxWidth: '200px' }, children: selectedCustomer.address || "N/A" })] }), _jsxs("div", { style: { borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '8px' }, children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: "Loyalty Points:" }), " ", _jsx("strong", { style: { float: 'right', color: 'var(--accent-blue)' }, children: selectedCustomer.loyaltyPoints })] }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: "Khata Balance:" }), " ", _jsxs("strong", { style: { float: 'right', color: selectedCustomer.khataBalance > 0 ? 'var(--accent-pink)' : '#fff' }, children: ["Rs ", selectedCustomer.khataBalance] })] }), _jsx("button", { onClick: () => setSelectedCustomer(null), className: "rgb-button filled", style: { marginTop: '24px' }, children: "Close Profile" })] }) })), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }, children: [_jsx("th", { style: { padding: '12px 0' }, children: "Customer Name" }), _jsx("th", { style: { padding: '12px 0' }, children: "Phone" }), _jsx("th", { style: { padding: '12px 0' }, children: "Address" }), _jsx("th", { style: { padding: '12px 0' }, children: "Khata Balance" }), _jsx("th", { style: { padding: '12px 0' }, children: "Loyalty Points" }), _jsx("th", { style: { padding: '12px 0', textAlign: 'right' }, children: "Actions" })] }) }), _jsx("tbody", { children: customers.map(c => (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, children: [_jsx("td", { style: { padding: '16px 0', fontWeight: 600 }, children: c.fullName }), _jsx("td", { style: { padding: '16px 0', color: 'var(--text-muted)' }, children: c.phone }), _jsx("td", { style: { padding: '16px 0', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: c.address }), _jsxs("td", { style: { padding: '16px 0', color: c.khataBalance > 0 ? 'var(--accent-pink)' : 'var(--text-main)' }, children: ["Rs ", c.khataBalance] }), _jsxs("td", { style: { padding: '16px 0', color: 'var(--accent-blue)', fontWeight: 'bold' }, children: [c.loyaltyPoints, " pts"] }), _jsx("td", { style: { padding: '16px 0', textAlign: 'right' }, children: _jsx("button", { onClick: () => setSelectedCustomer(c), style: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "View Details" }) })] }, c.id))) })] })] }));
}
