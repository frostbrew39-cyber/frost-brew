import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { apiUrl } from "../config";
export function InventoryManagement() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(null);
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
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setIsLoading(false);
        }
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', category: 'Ingredients', unit: 'pcs', alertAt: '10', purchasePrice: '0' });
    const [stockValue, setStockValue] = useState('0');
    const handleSubmit = async (e) => {
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
        }
        catch (e) {
            console.error(e);
            alert("Network error while saving item.");
        }
    };
    const handleStockUpdate = async (e) => {
        e.preventDefault();
        if (!editingId)
            return;
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
    if (isLoading)
        return _jsx("div", { style: { padding: '24px' }, children: "Loading inventory..." });
    return (_jsxs("div", { className: "printable-report", style: { padding: '24px' }, children: [_jsxs("div", { className: "no-print", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0 }, children: "Inventory & Stock Management" }), _jsxs("div", { style: { color: 'var(--accent-blue)', fontWeight: 700, marginTop: '4px' }, children: ["Total Valuation: Rs ", totalValuation.toLocaleString()] })] }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("button", { onClick: exportCSV, className: "rgb-button", style: { padding: '8px 16px', fontSize: '14px', width: 'auto' }, children: "Download CSV" }), _jsx("button", { onClick: () => window.print(), className: "rgb-button", style: { padding: '8px 16px', fontSize: '14px', width: 'auto' }, children: "Print Report" }), _jsx("button", { onClick: () => { setEditingId(null); setFormData({ name: '', category: 'Ingredients', unit: 'pcs', alertAt: '10', purchasePrice: '0' }); setIsModalOpen(true); }, className: "rgb-button filled", style: { padding: '8px 16px', fontSize: '14px', width: 'auto' }, children: "+ Add Item" })] })] }), isStockModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleStockUpdate, style: { width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: "Update Stock Level" }), _jsxs("p", { style: { color: 'var(--text-muted)', margin: 0 }, children: ["Updating ", _jsx("strong", { children: items.find(i => i.id === editingId)?.name })] }), _jsx("input", { autoFocus: true, required: true, type: "number", value: stockValue, onChange: e => setStockValue(e.target.value), style: { width: '100%', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '20px', textAlign: 'center' } }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("button", { type: "button", onClick: () => setIsStockModalOpen(false), className: "rgb-button", style: { flex: 1 }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1 }, disabled: isUpdating !== null, children: isUpdating ? 'Saving...' : 'Update' })] })] }) })), isModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleSubmit, style: { width: 'min(500px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: editingId ? "Edit Item" : "New Inventory Item" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }, children: [_jsxs("div", { style: { gridColumn: 'span 2' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Item Name" }), _jsx("input", { required: true, value: formData.name, onChange: e => setFormData({ ...formData, name: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Category" }), _jsxs("select", { value: formData.category, onChange: e => setFormData({ ...formData, category: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }, children: [_jsx("option", { children: "Ingredients" }), _jsx("option", { children: "Packaging" }), _jsx("option", { children: "Kitchen Tools" }), _jsx("option", { children: "Cleaning" }), _jsx("option", { children: "Other" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Unit" }), _jsxs("select", { value: formData.unit, onChange: e => setFormData({ ...formData, unit: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }, children: [_jsx("option", { children: "pcs" }), _jsx("option", { children: "kg" }), _jsx("option", { children: "gram" }), _jsx("option", { children: "liters" }), _jsx("option", { children: "ml" }), _jsx("option", { children: "box" })] })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Alert Level (Notify when below)" }), _jsx("input", { required: true, type: "number", value: formData.alertAt, onChange: e => setFormData({ ...formData, alertAt: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Purchase Price (per unit in Rs)" }), _jsx("input", { required: true, type: "number", value: formData.purchasePrice, onChange: e => setFormData({ ...formData, purchasePrice: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { style: { display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "rgb-button", style: { flex: 1, padding: '12px' }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1, padding: '12px' }, children: editingId ? "Save Changes" : "Add Item" })] })] }) })), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }, children: [_jsx("th", { style: { padding: '12px 0' }, children: "Item Name" }), _jsx("th", { style: { padding: '12px 0' }, children: "Category" }), _jsx("th", { style: { padding: '12px 0' }, children: "Current Stock" }), _jsx("th", { style: { padding: '12px 0' }, children: "Purchase Price" }), _jsx("th", { style: { padding: '12px 0' }, children: "Total Value" }), _jsx("th", { className: "no-print", style: { padding: '12px 0', textAlign: 'right' }, children: "Actions" })] }) }), _jsxs("tbody", { children: [items.map(item => (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, children: [_jsx("td", { style: { padding: '16px 0', fontWeight: 600 }, children: item.name }), _jsx("td", { style: { padding: '16px 0' }, children: item.category }), _jsxs("td", { style: { padding: '16px 0' }, children: [_jsxs("span", { style: { color: item.currentStock <= item.alertAt ? 'var(--accent-pink)' : 'var(--accent-green)', fontWeight: 700 }, children: [item.currentStock, " ", item.unit] }), item.currentStock <= item.alertAt && _jsx("span", { style: { fontSize: '10px', color: 'var(--accent-pink)', marginLeft: '8px' }, children: "Low!" })] }), _jsxs("td", { style: { padding: '16px 0', color: 'var(--text-muted)' }, children: ["Rs ", item.purchasePrice || 0] }), _jsxs("td", { style: { padding: '16px 0', fontWeight: 'bold' }, children: ["Rs ", (item.currentStock * (item.purchasePrice || 0)).toLocaleString()] }), _jsxs("td", { className: "no-print", style: { padding: '16px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }, children: [_jsx("button", { onClick: () => { setEditingId(item.id); setStockValue(item.currentStock.toString()); setIsStockModalOpen(true); }, style: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "Update Stock" }), _jsx("button", { onClick: () => {
                                                    setEditingId(item.id);
                                                    setFormData({ name: item.name, category: item.category, unit: item.unit, alertAt: item.alertAt.toString(), purchasePrice: (item.purchasePrice || 0).toString() });
                                                    setIsModalOpen(true);
                                                }, style: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "Edit" })] })] }, item.id))), items.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, style: { padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }, children: "No inventory items found." }) }))] })] })] }));
}
