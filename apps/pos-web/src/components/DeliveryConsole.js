import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { apiUrl } from "../config";
export function DeliveryConsole({ orders, onUpdateStatus }) {
    const [riders, setRiders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(null);
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
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setIsLoading(false);
        }
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', payRate: '', type: 'Per Delivery' });
    const [deliveriesValue, setDeliveriesValue] = useState('0');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const deliveryOrders = orders.filter((o) => o.channel === "DELIVERY" || o.status === "OUT_FOR_DELIVERY" || o.status === "FAILED_DELIVERY");
    const handleAddRider = async (e) => {
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
        }
        catch (e) {
            console.error(e);
            alert("Network error while adding rider.");
        }
    };
    const handleDeliveriesUpdate = async (e) => {
        e.preventDefault();
        if (!editingId)
            return;
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
            }
            else {
                const err = await res.json();
                alert("Failed: " + (err.message || "Unknown error"));
            }
        }
        catch (e) {
            console.error(e);
            alert("Network error.");
        }
        finally {
            setIsUpdating(null);
        }
    };
    if (isLoading)
        return _jsx("div", { style: { padding: '24px' }, children: "Loading delivery console..." });
    return (_jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsx("h2", { style: { margin: 0, marginBottom: '24px' }, children: "Delivery & Partner Dispatch" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [deliveryOrders.length === 0 && _jsx("p", { style: { color: 'var(--text-muted)' }, children: "No active delivery orders." }), deliveryOrders.map(d => (_jsxs("div", { className: "glass-panel", style: { padding: '16px', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: d.status === 'FAILED_DELIVERY' ? '4px solid var(--accent-pink)' : 'none' }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontWeight: 700, fontSize: '18px', marginBottom: '4px' }, children: [d.orderNo, " ", _jsxs("span", { style: { color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }, children: ["via ", d.partner || "Internal Rider"] })] }), _jsx("div", { style: { color: 'var(--text-main)', marginBottom: '4px' }, children: d.customerName || "Customer #" + d.customerId }), _jsxs("div", { style: { color: 'var(--text-muted)', fontSize: '14px' }, children: [d.customerPhone, " | ", d.customerAddress || "Pending Address"] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { style: {
                                            color: d.status === 'OUT_FOR_DELIVERY' ? 'var(--accent-blue)' : d.status === 'FAILED_DELIVERY' ? 'var(--accent-pink)' : 'var(--accent-green)',
                                            fontWeight: 600,
                                            padding: '4px 12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }, children: d.status.replace(/_/g, ' ') }), d.status !== 'COMPLETED' && d.status !== 'FAILED_DELIVERY' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => onUpdateStatus(d.id, "COMPLETED"), className: "rgb-button filled", style: { padding: '8px 16px', fontSize: '12px', width: 'auto' }, children: "Delivered" }), _jsx("button", { onClick: () => onUpdateStatus(d.id, "FAILED_DELIVERY"), className: "rgb-button", style: { padding: '8px 16px', fontSize: '12px', width: 'auto', color: 'var(--accent-pink)' }, children: "Failed" })] })), d.status === 'PENDING' && (_jsx("button", { className: "rgb-button", style: { padding: '8px 16px', fontSize: '12px', width: 'auto' }, children: "Assign Rider" }))] })] }, d.id)))] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', marginBottom: '24px' }, children: [_jsx("h2", { style: { margin: 0 }, children: "Rider Performance & Reports" }), _jsxs("div", { style: { display: 'flex', gap: '12px', alignItems: 'center' }, children: [_jsx("label", { style: { color: 'var(--text-muted)' }, children: "From:" }), _jsx("input", { type: "date", value: startDate, onChange: e => setStartDate(e.target.value), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' } }), _jsx("label", { style: { color: 'var(--text-muted)' }, children: "To:" }), _jsx("input", { type: "date", value: endDate, onChange: e => setEndDate(e.target.value), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' } }), _jsx("button", { onClick: () => setIsModalOpen(true), className: "rgb-button", style: { padding: '8px 16px', fontSize: '14px', width: 'auto', marginLeft: '8px' }, children: "+ Add Rider" })] })] }), isDeliveriesModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleDeliveriesUpdate, style: { width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: "Update Delivery Count" }), _jsxs("p", { style: { color: 'var(--text-muted)', margin: 0 }, children: ["Updating ", _jsx("strong", { children: riders.find(r => r.id === editingId)?.name })] }), _jsx("input", { autoFocus: true, required: true, type: "number", value: deliveriesValue, onChange: e => setDeliveriesValue(e.target.value), style: { width: '100%', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '20px', textAlign: 'center' } }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("button", { type: "button", onClick: () => setIsDeliveriesModalOpen(false), className: "rgb-button", style: { flex: 1 }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1 }, disabled: isUpdating !== null, children: isUpdating ? 'Saving...' : 'Update' })] })] }) })), isModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleAddRider, style: { width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: "New Delivery Rider" }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Name" }), _jsx("input", { required: true, value: formData.name, onChange: e => setFormData({ ...formData, name: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Phone Number" }), _jsx("input", { required: true, value: formData.phone, onChange: e => setFormData({ ...formData, phone: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Pay Rate (Rs)" }), _jsx("input", { required: true, type: "number", value: formData.payRate, onChange: e => setFormData({ ...formData, payRate: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Rate Type" }), _jsxs("select", { value: formData.type, onChange: e => setFormData({ ...formData, type: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }, children: [_jsx("option", { children: "Per Delivery" }), _jsx("option", { children: "Fixed Monthly" }), _jsx("option", { children: "Commission %" })] })] })] }), _jsxs("div", { style: { display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "rgb-button", style: { flex: 1, padding: '12px' }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1, padding: '12px' }, children: "Save Rider" })] })] }) })), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }, children: [_jsx("th", { style: { padding: '12px 0' }, children: "Rider Name" }), _jsx("th", { style: { padding: '12px 0' }, children: "Phone" }), _jsx("th", { style: { padding: '12px 0' }, children: "Pay Rate" }), _jsx("th", { style: { padding: '12px 0', textAlign: 'center' }, children: "Deliveries (Selected Dates)" }), _jsx("th", { style: { padding: '12px 0', textAlign: 'right' }, children: "Calculated Pay" })] }) }), _jsx("tbody", { children: riders.map(r => {
                            return (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, children: [_jsx("td", { style: { padding: '16px 0', fontWeight: 600 }, children: r.name }), _jsx("td", { style: { padding: '16px 0', color: 'var(--text-muted)' }, children: r.phone }), _jsxs("td", { style: { padding: '16px 0', color: 'var(--accent-blue)', fontWeight: 'bold' }, children: ["Rs ", r.payRate, " ", _jsx("span", { style: { fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }, children: r.type })] }), _jsxs("td", { style: { padding: '16px 0', textAlign: 'center', fontWeight: 'bold' }, children: [r.deliveriesDone, " ", _jsx("button", { onClick: () => { setEditingId(r.id); setDeliveriesValue(r.deliveriesDone.toString()); setIsDeliveriesModalOpen(true); }, style: { marginLeft: '8px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', border: 'none', background: 'var(--accent-blue)', color: '#fff', borderRadius: '4px' }, children: "Edit" })] }), _jsxs("td", { style: { padding: '16px 0', textAlign: 'right', color: 'var(--accent-green)', fontWeight: 'bold' }, children: ["Rs ", r.type === 'Per Delivery' ? r.payRate * r.deliveriesDone : r.payRate] })] }, r.id));
                        }) })] })] }));
}
