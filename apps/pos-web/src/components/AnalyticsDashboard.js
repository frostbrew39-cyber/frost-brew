import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from "react";
import { apiUrl } from "../config";
export function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    useEffect(() => {
        const t = localStorage.getItem('zenpos_token');
        if (!t)
            return;
        fetch(`${apiUrl("/analytics/overview")}?startDate=${startDate}&endDate=${endDate}`, {
            headers: { "Authorization": `Bearer ${t}` }
        })
            .then(res => res.json())
            .then(stats => setData(stats))
            .catch(err => console.error(err));
    }, [startDate, endDate]);
    const displayData = useMemo(() => {
        if (!data || !data.daily)
            return [];
        const msInDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msInDay);
        if (diffDays > 31) {
            const monthMap = new Map();
            data.daily.forEach((d) => {
                const month = d.date.substring(0, 7); // 'YYYY-MM'
                if (!monthMap.has(month)) {
                    monthMap.set(month, { date: month, successfulOrders: 0, cancelledOrders: 0, revenue: 0, taxCollected: 0 });
                }
                const m = monthMap.get(month);
                m.successfulOrders += d.successfulOrders;
                m.cancelledOrders += d.cancelledOrders;
                m.revenue += Number(d.revenue);
                m.taxCollected += Number(d.taxCollected || 0);
            });
            return Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        }
        return data.daily;
    }, [data, startDate, endDate]);
    const setQuickRange = (range) => {
        if (range === 'Custom')
            return;
        const d = new Date();
        const toIsoLocal = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().split('T')[0];
        };
        if (range === 'Today') {
            setStartDate(toIsoLocal(d));
            setEndDate(toIsoLocal(d));
        }
        else if (range === 'This Week') {
            const start = new Date(d);
            start.setDate(d.getDate() - d.getDay());
            setStartDate(toIsoLocal(start));
            setEndDate(toIsoLocal(d));
        }
        else if (range === 'This Month') {
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            setStartDate(toIsoLocal(start));
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            setEndDate(toIsoLocal(end));
        }
        else if (range === 'This Year') {
            const start = new Date(d.getFullYear(), 0, 1);
            setStartDate(toIsoLocal(start));
            const end = new Date(d.getFullYear(), 11, 31);
            setEndDate(toIsoLocal(end));
        }
    };
    const exportCSV = () => {
        const isMonthly = displayData.length > 0 && displayData[0].date.length === 7;
        let csv = `${isMonthly ? 'Month' : 'Date'},Successful Orders,Cancelled Orders,Revenue (Rs),Tax Collected (Rs)\n`;
        displayData.forEach((day) => {
            csv += `${day.date},${day.successfulOrders},${day.cancelledOrders},${day.revenue},${day.taxCollected || 0}\n`;
        });
        csv += `\nTOTAL,${data.totalOrders},${data.cancelledOrders},${data.grossSales},${data.taxCollected || 0}\n`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FrostAndBrew_Report_${startDate}_to_${endDate}.csv`;
        a.click();
    };
    if (!data)
        return _jsx("div", { style: { padding: '24px' }, children: "Loading analytics..." });
    return (_jsxs("div", { className: "printable-report", style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs("div", { className: "formal-print-only", style: { display: 'none', background: '#fff', color: '#000', padding: '40px', fontFamily: 'sans-serif' }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }, children: [_jsx("h1", { style: { margin: 0, fontSize: '28px' }, children: "FROST & BREW" }), _jsx("p", { style: { margin: '4px 0' }, children: "Official Sales & Tax Report" }), _jsxs("p", { style: { margin: '4px 0', fontSize: '14px', color: '#555' }, children: ["Period: ", startDate, " to ", endDate] }), _jsxs("p", { style: { margin: '4px 0', fontSize: '14px', color: '#555' }, children: ["Generated: ", new Date().toLocaleString()] })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }, children: [_jsxs("div", { children: [_jsx("h3", { style: { margin: 0, marginBottom: '12px' }, children: "Executive Summary" }), _jsxs("p", { style: { margin: '4px 0' }, children: [_jsx("strong", { children: "Gross Revenue:" }), " Rs ", Number(data.grossSales || 0).toLocaleString()] }), _jsxs("p", { style: { margin: '4px 0' }, children: [_jsx("strong", { children: "Tax Collected:" }), " Rs ", Number(data.taxCollected || 0).toLocaleString()] })] }), _jsxs("div", { style: { textAlign: 'right' }, children: [_jsxs("p", { style: { margin: '4px 0' }, children: [_jsx("strong", { children: "Total Orders:" }), " ", data.totalOrders || 0] }), _jsxs("p", { style: { margin: '4px 0' }, children: [_jsx("strong", { children: "Cancelled Orders:" }), " ", data.cancelledOrders || 0] })] })] }), _jsx("h3", { style: { borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }, children: displayData.length > 0 && displayData[0].date.length === 7 ? 'Monthly Breakdown' : 'Daily Breakdown' }), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { backgroundColor: '#f0f0f0' }, children: [_jsx("th", { style: { padding: '8px', border: '1px solid #ccc' }, children: displayData.length > 0 && displayData[0].date.length === 7 ? 'Month' : 'Date' }), _jsx("th", { style: { padding: '8px', border: '1px solid #ccc' }, children: "Success" }), _jsx("th", { style: { padding: '8px', border: '1px solid #ccc' }, children: "Cancelled" }), _jsx("th", { style: { padding: '8px', border: '1px solid #ccc' }, children: "Revenue" }), _jsx("th", { style: { padding: '8px', border: '1px solid #ccc' }, children: "Tax Collected" })] }) }), _jsx("tbody", { children: displayData.map((day) => (_jsxs("tr", { children: [_jsx("td", { style: { padding: '8px', border: '1px solid #ccc' }, children: day.date }), _jsx("td", { style: { padding: '8px', border: '1px solid #ccc', color: 'green' }, children: day.successfulOrders }), _jsx("td", { style: { padding: '8px', border: '1px solid #ccc', color: 'red' }, children: day.cancelledOrders }), _jsxs("td", { style: { padding: '8px', border: '1px solid #ccc' }, children: ["Rs ", Number(day.revenue).toLocaleString()] }), _jsxs("td", { style: { padding: '8px', border: '1px solid #ccc' }, children: ["Rs ", Number(day.taxCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })] })] }, day.date))) })] }), _jsxs("div", { style: { marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#777' }, children: [_jsx("p", { style: { margin: '4px 0' }, children: "This is a computer-generated document and requires no signature." }), _jsx("p", { style: { margin: '4px 0' }, children: "Powered by ZenPOS Pro Enterprise" })] })] }), _jsxs("div", { className: "no-print", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("h2", { style: { margin: 0 }, children: "Sales & Analytics Reports" }), _jsxs("div", { style: { display: 'flex', gap: '12px', alignItems: 'center' }, children: [_jsxs("select", { onChange: (e) => setQuickRange(e.target.value), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--accent-blue)', outline: 'none', fontWeight: 'bold' }, defaultValue: "Custom", children: [_jsx("option", { value: "Custom", children: "Custom Range..." }), _jsx("option", { value: "Today", children: "Today" }), _jsx("option", { value: "This Week", children: "This Week" }), _jsx("option", { value: "This Month", children: "This Month" }), _jsx("option", { value: "This Year", children: "This Year" })] }), _jsx("label", { style: { color: 'var(--text-muted)' }, children: "From:" }), _jsx("input", { type: "date", value: startDate, onChange: e => setStartDate(e.target.value), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' } }), _jsx("label", { style: { color: 'var(--text-muted)' }, children: "To:" }), _jsx("input", { type: "date", value: endDate, onChange: e => setEndDate(e.target.value), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' } }), _jsx("button", { onClick: exportCSV, className: "rgb-button", style: { padding: '8px 16px', fontSize: '14px', marginLeft: '12px', background: 'transparent' }, children: "Download CSV" }), _jsx("button", { onClick: () => {
                                    document.body.classList.add("printing-formal-report");
                                    window.print();
                                    setTimeout(() => document.body.classList.remove("printing-formal-report"), 500);
                                }, className: "rgb-button filled", style: { padding: '8px 16px', fontSize: '14px' }, children: "Formal PDF Report" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }, children: [_jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsx("div", { style: { color: 'var(--text-muted)', marginBottom: '8px' }, children: "Gross Revenue" }), _jsxs("div", { className: "gradient-text", style: { fontSize: '32px', fontWeight: 700 }, children: ["Rs ", Number(data.grossSales || 0).toLocaleString()] })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsx("div", { style: { color: 'var(--text-muted)', marginBottom: '8px' }, children: "Tax Collected (Historical)" }), _jsxs("div", { style: { color: 'var(--accent-blue)', fontSize: '32px', fontWeight: 700 }, children: ["Rs ", Number(data.taxCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })] })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsx("div", { style: { color: 'var(--text-muted)', marginBottom: '8px' }, children: "Successful Orders" }), _jsx("div", { style: { color: 'var(--accent-blue)', fontSize: '32px', fontWeight: 700 }, children: data.totalOrders || 0 })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px' }, children: [_jsx("div", { style: { color: 'var(--text-muted)', marginBottom: '8px' }, children: "Cancelled Orders" }), _jsx("div", { style: { color: 'var(--accent-pink)', fontSize: '32px', fontWeight: 700 }, children: data.cancelledOrders || 0 })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }, children: [_jsxs("div", { className: "glass-panel", style: { padding: '24px', display: 'flex', flexDirection: 'column' }, children: [_jsx("h3", { style: { marginTop: 0, marginBottom: '24px' }, children: "Order Status Breakdown" }), _jsxs("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }, children: [_jsx("div", { style: { width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(var(--accent-blue) 0% 85%, var(--accent-pink) 85% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("div", { style: { width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-dark)' } }) }), _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }, children: [_jsx("span", { style: { width: 12, height: 12, borderRadius: 2, background: 'var(--accent-blue)' } }), " ", _jsx("span", { style: { color: 'var(--text-muted)', fontSize: '14px' }, children: "Successful (85%)" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { width: 12, height: 12, borderRadius: 2, background: 'var(--accent-pink)' } }), " ", _jsx("span", { style: { color: 'var(--text-muted)', fontSize: '14px' }, children: "Cancelled (15%)" })] })] })] })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px', display: 'flex', flexDirection: 'column' }, children: [_jsx("h3", { style: { marginTop: 0, marginBottom: '24px' }, children: "Payment Status" }), _jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }, children: [_jsx("span", { children: "Cash / Card" }), _jsx("span", { children: "80%" })] }), _jsx("div", { style: { width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }, children: _jsx("div", { style: { width: '80%', height: '100%', background: 'var(--accent-green)' } }) })] }), _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }, children: [_jsx("span", { children: "Khata (Pending)" }), _jsx("span", { children: "20%" })] }), _jsx("div", { style: { width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }, children: _jsx("div", { style: { width: '20%', height: '100%', background: 'var(--accent-pink)' } }) })] })] })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px', display: 'flex', flexDirection: 'column' }, children: [_jsx("h3", { style: { marginTop: 0, marginBottom: '24px' }, children: "Sales Trend (Selected Period)" }), _jsxs("div", { style: { flex: 1, display: 'flex', alignItems: 'flex-end', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }, children: [displayData.slice(-7).map((val, i) => {
                                        // Calculate relative height for chart
                                        const maxRev = Math.max(...displayData.map((d) => Number(d.revenue)));
                                        const heightPct = maxRev > 0 ? (Number(val.revenue) / maxRev) * 100 : 10;
                                        return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }, children: [_jsx("div", { style: {
                                                        width: '100%',
                                                        height: `${heightPct}%`,
                                                        minHeight: '4px',
                                                        background: 'linear-gradient(to top, var(--accent-blue), var(--accent-pink))',
                                                        borderRadius: '4px 4px 0 0',
                                                        opacity: 0.8,
                                                        transition: 'height 0.5s ease'
                                                    }, title: `Rs ${val.revenue}` }), _jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: val.date.slice(-5) })] }, i));
                                    }), displayData.length === 0 && _jsx("div", { style: { color: 'var(--text-muted)', margin: 'auto' }, children: "No data" })] })] })] }), _jsxs("div", { className: "glass-panel", style: { padding: '24px', height: '300px', overflowY: 'auto' }, children: [_jsx("h3", { style: { marginTop: 0, marginBottom: '24px' }, children: "Detailed Sales Report" }), _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }, children: [_jsx("th", { style: { paddingBottom: '8px' }, children: displayData.length > 0 && displayData[0].date.length === 7 ? 'Month' : 'Date' }), _jsx("th", { style: { paddingBottom: '8px' }, children: "Successful" }), _jsx("th", { style: { paddingBottom: '8px' }, children: "Cancelled" }), _jsx("th", { style: { paddingBottom: '8px' }, children: "Revenue" }), _jsx("th", { style: { paddingBottom: '8px' }, children: "Tax Collected" }), _jsx("th", { style: { paddingBottom: '8px', textAlign: 'right' }, children: "Actions" })] }) }), _jsxs("tbody", { children: [displayData.map((day) => (_jsxs("tr", { style: { borderBottom: '1px solid rgba(255,255,255,0.02)' }, children: [_jsx("td", { style: { padding: '12px 0' }, children: day.date }), _jsx("td", { style: { padding: '12px 0', color: 'var(--accent-green)' }, children: day.successfulOrders }), _jsx("td", { style: { padding: '12px 0', color: 'var(--accent-pink)' }, children: day.cancelledOrders }), _jsxs("td", { style: { padding: '12px 0' }, children: ["Rs ", Number(day.revenue).toLocaleString()] }), _jsxs("td", { style: { padding: '12px 0', color: 'var(--accent-blue)' }, children: ["Rs ", Number(day.taxCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })] }), _jsx("td", { style: { padding: '12px 0', textAlign: 'right' }, children: _jsx("button", { onClick: () => {
                                                        document.body.classList.add("printing-formal-report");
                                                        window.print();
                                                        setTimeout(() => document.body.classList.remove("printing-formal-report"), 500);
                                                    }, style: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }, children: "Print Report" }) })] }, day.date))), displayData.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, style: { padding: '12px 0', color: 'var(--text-muted)' }, children: "No data for selected period" }) }))] })] })] })] }));
}
