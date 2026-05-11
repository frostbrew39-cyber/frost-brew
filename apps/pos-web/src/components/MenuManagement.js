import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function MenuManagement({ items, onUpdateItems }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '', category: 'Burgers', price: '', img: ''
    });
    const handleDelete = (id) => {
        onUpdateItems(items.filter(item => item.id !== id));
    };
    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ name: item.name, category: item.category, price: item.price.toString(), img: item.img });
        setIsModalOpen(true);
    };
    const handleAdd = () => {
        setEditingItem(null);
        setFormData({ name: '', category: 'Burgers', price: '', img: '' });
        setIsModalOpen(true);
    };
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData({ ...formData, img: event.target?.result });
            };
            reader.readAsDataURL(file);
        }
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingItem) {
            onUpdateItems(items.map(item => item.id === editingItem.id ? { ...item, ...formData, price: Number(formData.price) } : item));
        }
        else {
            const newItem = { id: Date.now(), ...formData, price: Number(formData.price) };
            onUpdateItems([...items, newItem]);
        }
        setIsModalOpen(false);
    };
    return (_jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }, children: [_jsx("h2", { style: { margin: 0 }, children: "Menu Management" }), _jsx("button", { className: "rgb-button", onClick: handleAdd, style: { padding: '8px 16px', fontSize: '14px', width: 'auto' }, children: "+ Add Menu Item" })] }), isModalOpen && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("form", { className: "glass-panel", onSubmit: handleSubmit, style: { width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { margin: 0 }, children: editingItem ? 'Edit Item' : 'New Menu Item' }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Name" }), _jsx("input", { required: true, value: formData.name, onChange: e => setFormData({ ...formData, name: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Category" }), _jsxs("select", { value: formData.category, onChange: e => setFormData({ ...formData, category: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }, children: [_jsx("option", { children: "Burgers" }), _jsx("option", { children: "Sides" }), _jsx("option", { children: "Drinks" }), _jsx("option", { children: "Coffee" }), _jsx("option", { children: "Ice Cream" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Price (Rs)" }), _jsx("input", { required: true, type: "number", value: formData.price, onChange: e => setFormData({ ...formData, price: e.target.value }), style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Image Upload" }), _jsx("input", { type: "file", accept: "image/*", onChange: handleImageUpload, style: { width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' } }), formData.img && _jsx("img", { src: formData.img, alt: "Preview", style: { width: '80px', height: '80px', marginTop: '12px', borderRadius: '8px', objectFit: 'cover' } })] }), _jsxs("div", { style: { display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "rgb-button", style: { flex: 1, padding: '12px' }, children: "Cancel" }), _jsx("button", { type: "submit", className: "rgb-button filled", style: { flex: 1, padding: '12px' }, children: "Save" })] })] }) })), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }, children: [_jsx("th", { style: { padding: '12px 0' }, children: "Preview" }), _jsx("th", { style: { padding: '12px 0' }, children: "Name" }), _jsx("th", { style: { padding: '12px 0' }, children: "Category" }), _jsx("th", { style: { padding: '12px 0' }, children: "Price" }), _jsx("th", { style: { padding: '12px 0', textAlign: 'right' }, children: "Actions" })] }) }), _jsx("tbody", { children: items.map(item => (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, children: [_jsx("td", { style: { padding: '12px 0' }, children: _jsx("img", { src: item.img, alt: "", style: { width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' } }) }), _jsx("td", { style: { padding: '16px 0', fontWeight: 600 }, children: item.name }), _jsx("td", { style: { padding: '16px 0' }, children: _jsx("span", { className: "category-pill", style: { padding: '4px 12px', fontSize: '12px' }, children: item.category }) }), _jsxs("td", { style: { padding: '16px 0', color: 'var(--accent-blue)', fontWeight: 'bold' }, children: ["Rs ", item.price] }), _jsxs("td", { style: { padding: '16px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }, children: [_jsx("button", { onClick: () => handleEdit(item), style: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "Edit" }), _jsx("button", { onClick: () => handleDelete(item.id), style: { background: 'transparent', border: '1px solid var(--accent-pink)', color: 'var(--accent-pink)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }, children: "Delete" })] })] }, item.id))) })] })] }));
}
