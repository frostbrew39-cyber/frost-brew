import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { apiUrl } from "../config";
export function SettingsPage() {
    const [settings, setSettings] = useState({
        branchName: localStorage.getItem('zenpos_branchName') || "Frost & Brew Main",
        phone: localStorage.getItem('zenpos_phone') || "+92 300 1234567",
        taxRate: Number(localStorage.getItem('zenpos_taxRate') || 10),
        myPassword: ""
    });
    const handleSave = async () => {
        localStorage.setItem('zenpos_branchName', settings.branchName);
        localStorage.setItem('zenpos_phone', settings.phone);
        localStorage.setItem('zenpos_taxRate', settings.taxRate.toString());
        window.dispatchEvent(new Event('settings_updated'));
        if (settings.myPassword && settings.myPassword.length >= 3) {
            try {
                const tokenData = await fetch(apiUrl("/auth/me"), {
                    headers: { "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` }
                }).then(r => r.json());
                if (tokenData && tokenData.sub) {
                    await fetch(apiUrl(`/staff/${tokenData.sub}`), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` },
                        body: JSON.stringify({ password: settings.myPassword })
                    });
                    setSettings({ ...settings, myPassword: "" });
                }
            }
            catch (e) {
                console.error("Failed to update password", e);
            }
        }
        alert("Settings saved successfully!");
    };
    return (_jsxs("div", { className: "glass-panel", style: { padding: '32px', maxWidth: '600px' }, children: [_jsx("h2", { style: { margin: 0, marginBottom: '24px' }, children: "System Settings" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "Branch Name" }), _jsx("input", { type: "text", value: settings.branchName, onChange: e => setSettings({ ...settings, branchName: e.target.value }), style: { width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "Contact Phone" }), _jsx("input", { type: "text", value: settings.phone, onChange: e => setSettings({ ...settings, phone: e.target.value }), style: { width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "Tax Rate (%)" }), _jsx("input", { type: "number", value: settings.taxRate, onChange: e => setSettings({ ...settings, taxRate: Number(e.target.value) }), style: { width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' } })] }), _jsxs("div", { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }, children: [_jsx("h3", { style: { margin: 0, marginBottom: '16px' }, children: "Account Security" }), _jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "Update My Password (Leave blank to keep current)" }), _jsx("input", { type: "password", minLength: 3, placeholder: "Enter new password", value: settings.myPassword, onChange: e => setSettings({ ...settings, myPassword: e.target.value }), style: { width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' } })] }), _jsxs("div", { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }, children: [_jsx("h3", { style: { margin: 0, marginBottom: '16px' }, children: "Theme Options" }), _jsxs("div", { style: { display: 'flex', gap: '16px', marginTop: '16px' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "Primary Accent" }), _jsx("input", { type: "color", defaultValue: "#00f0ff", onChange: (e) => document.documentElement.style.setProperty('--accent-blue', e.target.value), style: { width: '100%', height: '50px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '8px' } })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { style: { display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }, children: "Secondary Accent" }), _jsx("input", { type: "color", defaultValue: "#ff007f", onChange: (e) => document.documentElement.style.setProperty('--accent-pink', e.target.value), style: { width: '100%', height: '50px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '8px' } })] })] })] }), _jsx("button", { onClick: handleSave, className: "rgb-button", style: { marginTop: '24px', padding: '16px', fontSize: '16px' }, children: "Save Changes" })] })] }));
}
