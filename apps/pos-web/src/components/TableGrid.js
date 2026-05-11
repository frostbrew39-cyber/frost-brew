import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
function parseTableTag(notes) {
    if (!notes)
        return null;
    const m = String(notes).match(/TABLE:(T\d+)/i);
    return m ? m[1].toUpperCase() : null;
}
export function TableGrid({ orders, onTableClick }) {
    const tableIds = useMemo(() => Array.from({ length: 12 }, (_, i) => `T${i + 1}`), []);
    const occupancy = useMemo(() => {
        const map = {};
        for (const o of orders) {
            if (o.status !== "PENDING")
                continue;
            const tid = parseTableTag(o.notes);
            if (tid)
                map[tid] = { orderId: o.id, orderNo: o.orderNo || `#${o.id}` };
        }
        return map;
    }, [orders]);
    return (_jsxs("div", { className: "glass-panel", style: { padding: "24px" }, children: [_jsx("h2", { style: { marginTop: 0, marginBottom: "8px" }, children: "Table layout" }), _jsx("p", { style: { color: "var(--text-muted)", marginBottom: "24px", fontSize: "14px" }, children: "Tap a table: waiters open the menu for open tickets; cashiers open billing for occupied tables." }), _jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: "16px"
                }, children: tableIds.map((tid) => {
                    const occ = occupancy[tid];
                    const occupied = !!occ;
                    return (_jsxs("button", { type: "button", className: "glass-panel", onClick: () => onTableClick({
                            tableId: tid,
                            occupied,
                            orderId: occ?.orderId,
                            orderNo: occ?.orderNo
                        }), style: {
                            cursor: "pointer",
                            padding: "20px 16px",
                            textAlign: "center",
                            border: occupied ? "2px solid var(--accent-pink)" : "1px solid var(--border-glass)",
                            background: occupied ? "rgba(255,0,127,0.08)" : "var(--bg-card)",
                            color: "var(--text-main)",
                            borderRadius: "16px",
                            minHeight: "100px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: "8px"
                        }, children: [_jsx("div", { style: { fontSize: "20px", fontWeight: 800 }, children: tid }), _jsx("div", { style: { fontSize: "12px", color: "var(--text-muted)" }, children: occupied ? `Open · ${occ?.orderNo}` : "Available" })] }, tid));
                }) })] }));
}
