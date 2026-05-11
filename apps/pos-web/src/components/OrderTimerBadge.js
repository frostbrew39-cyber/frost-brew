import { jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
function formatMs(ms) {
    const sec = Math.floor(ms / 1000);
    const min = String(Math.floor(sec / 60)).padStart(2, "0");
    const remSec = String(sec % 60).padStart(2, "0");
    return `${min}:${remSec}`;
}
export function OrderTimerBadge({ placedAt, status }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const elapsed = useMemo(() => now - new Date(placedAt).getTime(), [now, placedAt]);
    const urgent = elapsed > 15 * 60 * 1000;
    return (_jsxs("span", { style: {
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 16,
            background: urgent ? "rgba(255,64,64,0.25)" : "rgba(0,210,255,0.2)",
            color: urgent ? "#ff7b7b" : "#8de8ff",
            fontWeight: 700
        }, children: [status, " \u2022 ", formatMs(elapsed)] }));
}
