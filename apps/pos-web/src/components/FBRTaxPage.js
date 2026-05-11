import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function FBRTaxPage() {
    const [fbrData, setFbrData] = useState({
        posId: localStorage.getItem('fbr_posId') !== null ? localStorage.getItem('fbr_posId') : '100124',
        ntn: localStorage.getItem('fbr_ntn') !== null ? localStorage.getItem('fbr_ntn') : '3214567-8',
        status: 'Connected'
    });
    const [showSaved, setShowSaved] = useState(false);
    const handleSave = () => {
        localStorage.setItem('fbr_posId', fbrData.posId);
        localStorage.setItem('fbr_ntn', fbrData.ntn);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
    };
    const handlePrint = () => {
        document.body.classList.add("printing-report");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-report"), 500);
    };
    return (_jsxs("div", { className: "printable-report glass-panel", style: { padding: '32px', maxWidth: '800px' }, children: [_jsx("h2", { style: { margin: 0, marginBottom: '24px' }, children: "FBR Tax Integration" }), showSaved && (_jsx("div", { style: {
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'var(--accent-green)', color: '#000',
                    padding: '12px 24px', borderRadius: '12px',
                    fontWeight: 'bold', zIndex: 100,
                    boxShadow: '0 0 20px var(--accent-green)',
                    animation: 'fadeInOut 3s forwards'
                }, children: "\u2705 FBR Settings Saved" })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }, children: [_jsxs("div", { className: "glass-panel", style: { padding: '24px', background: 'var(--bg-card)' }, children: [_jsx("h3", { style: { margin: 0, marginBottom: '16px', color: 'var(--text-muted)' }, children: "Status" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { style: { width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' } }), _jsx("span", { style: { fontSize: '24px', fontWeight: 700 }, children: fbrData.status })] })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px', background: 'var(--bg-card)' }, children: [_jsx("h3", { style: { margin: 0, marginBottom: '16px', color: 'var(--text-muted)' }, children: "Generated Invoices" }), _jsx("span", { style: { fontSize: '24px', fontWeight: 700 }, children: "1,245 Today" })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "FBR POS ID" }), _jsx("input", { type: "text", value: fbrData.posId, onChange: (e) => setFbrData({ ...fbrData, posId: e.target.value }), style: { width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "NTN Number" }), _jsx("input", { type: "text", value: fbrData.ntn, onChange: (e) => setFbrData({ ...fbrData, ntn: e.target.value }), style: { width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' } })] }), _jsxs("div", { className: "no-print", style: { display: 'flex', gap: '16px', marginTop: '16px' }, children: [_jsx("button", { onClick: handleSave, className: "rgb-button", style: { flex: 1, background: showSaved ? 'var(--accent-green)' : '', color: showSaved ? '#000' : '' }, children: showSaved ? "Configuration Saved!" : "Save Configuration" }), _jsx("button", { onClick: handlePrint, className: "rgb-button filled", style: { flex: 1 }, children: "Generate Tax Report (PDF)" })] })] })] }));
}
