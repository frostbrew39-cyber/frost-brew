import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { apiUrl } from "../config";
export function CheckoutModal({ isOpen, onClose, total, onConfirm }) {
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [amountGiven, setAmountGiven] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [customerData, setCustomerData] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [customerMode, setCustomerMode] = useState("SEARCH");
    if (!isOpen)
        return null;
    const change = amountGiven !== "" ? Number(amountGiven) - total : 0;
    const isSufficient = amountGiven !== "" && Number(amountGiven) >= total;
    return (_jsx("div", { style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }, children: _jsxs("div", { className: "glass-panel", style: { width: 'min(500px, 92vw)', padding: 'clamp(16px, 4vw, 32px)' }, children: [_jsx("h2", { style: { marginTop: 0, marginBottom: '24px', fontSize: '28px' }, children: "Checkout" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '20px' }, children: [_jsx("span", { children: "Total Due:" }), _jsxs("span", { className: "gradient-text", style: { fontWeight: 700 }, children: ["Rs ", total] })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }, children: ['CASH', 'CARD', 'WALLET', 'KHATA'].map(method => (_jsx("button", { className: `category-pill ${paymentMethod === method ? 'active' : ''}`, onClick: () => setPaymentMethod(method), children: method }, method))) }), paymentMethod === 'CASH' && (_jsxs("div", { style: { marginBottom: '24px' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }, children: "Amount Given (Rs):" }), _jsx("input", { type: "number", value: amountGiven, onChange: (e) => setAmountGiven(e.target.value ? Number(e.target.value) : ""), style: {
                                width: '100%', padding: '16px', borderRadius: '12px',
                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)',
                                color: 'white', fontSize: '18px', outline: 'none'
                            }, autoFocus: true }), amountGiven !== "" && (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: '16px', color: isSufficient ? '#00ff66' : '#ff007f' }, children: [_jsx("span", { children: "Change to return:" }), _jsxs("span", { style: { fontWeight: 700 }, children: ["Rs ", Math.max(0, change)] })] }))] })), _jsxs("div", { style: { marginBottom: '24px', padding: '16px', border: '1px solid var(--border-glass)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }, children: [_jsx("h3", { style: { margin: 0, fontSize: '16px', color: 'var(--text-main)' }, children: "Customer Information (Optional)" }), customerMode === 'SEARCH' ? (_jsx("button", { onClick: () => { setCustomerMode('NEW'); setCustomerData(null); setSearchResults([]); setSearchQuery(""); }, style: { background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '14px' }, children: "+ New Customer" })) : (_jsx("button", { onClick: () => { setCustomerMode('SEARCH'); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); }, style: { background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '14px' }, children: "Search Existing" }))] }), customerMode === "SEARCH" && !customerData && (_jsxs("div", { style: { position: 'relative' }, children: [_jsx("input", { type: "text", placeholder: "Search by Phone or Name...", value: searchQuery, onChange: async (e) => {
                                        const val = e.target.value;
                                        setSearchQuery(val);
                                        if (val.length >= 3) {
                                            setIsSearching(true);
                                            try {
                                                const token = localStorage.getItem('zenpos_token');
                                                const res = await fetch(`${apiUrl("/customers")}?query=${val}`, {
                                                    headers: { "Authorization": `Bearer ${token}` }
                                                });
                                                const data = await res.json();
                                                setSearchResults(data || []);
                                            }
                                            catch (e) {
                                                setSearchResults([]);
                                            }
                                            finally {
                                                setIsSearching(false);
                                            }
                                        }
                                        else {
                                            setSearchResults([]);
                                        }
                                    }, style: {
                                        width: '100%', padding: '12px', borderRadius: '8px',
                                        background: 'var(--bg-dark)', border: '1px solid var(--border-glass)',
                                        color: 'white', outline: 'none'
                                    } }), isSearching && _jsx("div", { style: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }, children: "Searching..." }), searchResults.length > 0 && (_jsx("div", { style: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a24', border: '1px solid var(--border-glass)', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }, children: searchResults.map(c => (_jsxs("div", { onClick: () => {
                                            setCustomerData(c);
                                            setCustomerName(c.fullName);
                                            setCustomerPhone(c.phone);
                                            setCustomerAddress(c.address || "");
                                            setSearchResults([]);
                                            setSearchQuery("");
                                        }, style: { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }, children: [_jsx("div", { style: { fontWeight: 'bold' }, children: c.fullName }), _jsx("div", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: c.phone })] }, c.id))) }))] })), customerMode === "NEW" && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [_jsx("input", { type: "text", placeholder: "Full Name", value: customerName, onChange: e => setCustomerName(e.target.value), style: { width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'white', outline: 'none' } }), _jsx("input", { type: "text", placeholder: "Phone Number", value: customerPhone, onChange: e => setCustomerPhone(e.target.value), style: { width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'white', outline: 'none' } }), _jsx("input", { type: "text", placeholder: "Delivery Address (Street, City, Zone)", value: customerAddress, onChange: e => setCustomerAddress(e.target.value), style: { width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'white', outline: 'none' } })] })), customerData && customerMode === "SEARCH" && (_jsxs("div", { style: { background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.2)', padding: '12px', borderRadius: '8px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("strong", { style: { fontSize: '16px' }, children: customerData.fullName }), _jsx("button", { onClick: () => { setCustomerData(null); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); }, style: { background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', fontSize: '12px' }, children: "Remove" })] }), _jsx("div", { style: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }, children: customerData.phone }), _jsxs("div", { style: { display: 'flex', gap: '16px', fontSize: '14px' }, children: [_jsxs("span", { style: { color: 'var(--accent-blue)' }, children: ["\u2605 ", customerData.loyaltyPoints, " Points"] }), customerData.khataBalance > 0 && (_jsxs("span", { style: { color: 'var(--accent-pink)' }, children: ["Khata Due: Rs ", customerData.khataBalance] }))] })] })), paymentMethod === 'KHATA' && !customerData && !customerName && (_jsx("p", { style: { color: 'var(--accent-pink)', marginTop: '8px', fontSize: '14px' }, children: "* Customer required for Khata." }))] }), _jsxs("div", { style: { display: 'flex', gap: '16px', marginTop: '32px' }, children: [_jsx("button", { onClick: onClose, className: "rgb-button", style: { flex: 1, padding: '16px' }, children: "Cancel" }), _jsx("button", { onClick: () => {
                                // Create mock customer on the fly if needed
                                const finalCustomerId = customerData ? customerData.id : undefined;
                                onConfirm({
                                    method: paymentMethod,
                                    amount: total,
                                    customerId: finalCustomerId,
                                    customerName,
                                    customerPhone,
                                    customerAddress
                                });
                                setSearchQuery("");
                                setCustomerPhone("");
                                setCustomerName("");
                                setCustomerAddress("");
                                setCustomerData(null);
                                setSearchResults([]);
                                setCustomerMode("SEARCH");
                            }, disabled: paymentMethod === 'CASH' && !isSufficient, className: "rgb-button filled", style: { flex: 1, padding: '16px', opacity: (paymentMethod === 'CASH' && !isSufficient) ? 0.5 : 1 }, children: "Confirm Payment" })] })] }) }));
}
