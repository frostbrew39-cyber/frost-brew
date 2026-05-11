import { useEffect, useState, useMemo } from "react";
import { apiUrl } from "../config";

export function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const t = localStorage.getItem('zenpos_token');
    if (!t) return;
    fetch(`${apiUrl("/analytics/overview")}?startDate=${startDate}&endDate=${endDate}`, {
      headers: { "Authorization": `Bearer ${t}` }
    })
    .then(res => res.json())
    .then(stats => setData(stats))
    .catch(err => console.error(err));
  }, [startDate, endDate]);

  const displayData = useMemo(() => {
    if (!data || !data.daily) return [];
    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msInDay);
    
    if (diffDays > 31) {
      const monthMap = new Map<string, any>();
      data.daily.forEach((d: any) => {
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

  const setQuickRange = (range: string) => {
    if (range === 'Custom') return;
    const d = new Date();
    const toIsoLocal = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().split('T')[0];
    };
    
    if (range === 'Today') {
      setStartDate(toIsoLocal(d));
      setEndDate(toIsoLocal(d));
    } else if (range === 'This Week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      setStartDate(toIsoLocal(start));
      setEndDate(toIsoLocal(d));
    } else if (range === 'This Month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      setStartDate(toIsoLocal(start));
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setEndDate(toIsoLocal(end));
    } else if (range === 'This Year') {
      const start = new Date(d.getFullYear(), 0, 1);
      setStartDate(toIsoLocal(start));
      const end = new Date(d.getFullYear(), 11, 31);
      setEndDate(toIsoLocal(end));
    }
  };

  const exportCSV = () => {
    const isMonthly = displayData.length > 0 && displayData[0].date.length === 7;
    let csv = `${isMonthly ? 'Month' : 'Date'},Successful Orders,Cancelled Orders,Revenue (Rs),Tax Collected (Rs)\n`;
    displayData.forEach((day: any) => {
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

  if (!data) return <div style={{ padding: '24px' }}>Loading analytics...</div>;

  return (
    <div className="printable-report" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HIDDEN FORMAL REPORT FOR PRINTING */}
      <div className="formal-print-only" style={{ display: 'none', background: '#fff', color: '#000', padding: '40px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>FROST & BREW</h1>
          <p style={{ margin: '4px 0' }}>Official Sales & Tax Report</p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>Period: {startDate} to {endDate}</p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>Generated: {new Date().toLocaleString()}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '12px' }}>Executive Summary</h3>
            <p style={{ margin: '4px 0' }}><strong>Gross Revenue:</strong> Rs {Number(data.grossSales || 0).toLocaleString()}</p>
            <p style={{ margin: '4px 0' }}><strong>Tax Collected:</strong> Rs {Number(data.taxCollected || 0).toLocaleString()}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '4px 0' }}><strong>Total Orders:</strong> {data.totalOrders || 0}</p>
            <p style={{ margin: '4px 0' }}><strong>Cancelled Orders:</strong> {data.cancelledOrders || 0}</p>
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>{displayData.length > 0 && displayData[0].date.length === 7 ? 'Monthly Breakdown' : 'Daily Breakdown'}</h3>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>{displayData.length > 0 && displayData[0].date.length === 7 ? 'Month' : 'Date'}</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Success</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Cancelled</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Revenue</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Tax Collected</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((day: any) => (
              <tr key={day.date}>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{day.date}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc', color: 'green' }}>{day.successfulOrders}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc', color: 'red' }}>{day.cancelledOrders}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>Rs {Number(day.revenue).toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>Rs {Number(day.taxCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#777' }}>
          <p style={{ margin: '4px 0' }}>This is a computer-generated document and requires no signature.</p>
          <p style={{ margin: '4px 0' }}>Powered by ZenPOS Pro Enterprise</p>
        </div>
      </div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Sales & Analytics Reports</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            onChange={(e) => setQuickRange(e.target.value)} 
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--accent-blue)', outline: 'none', fontWeight: 'bold' }}
            defaultValue="Custom"
          >
            <option value="Custom">Custom Range...</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </select>
          <label style={{ color: 'var(--text-muted)' }}>From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
          <label style={{ color: 'var(--text-muted)' }}>To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
          <button onClick={exportCSV} className="rgb-button" style={{ padding: '8px 16px', fontSize: '14px', marginLeft: '12px', background: 'transparent' }}>Download CSV</button>
          <button onClick={() => {
             document.body.classList.add("printing-formal-report");
             window.print();
             setTimeout(() => document.body.classList.remove("printing-formal-report"), 500);
          }} className="rgb-button filled" style={{ padding: '8px 16px', fontSize: '14px' }}>Formal PDF Report</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Gross Revenue</div>
          <div className="gradient-text" style={{ fontSize: '32px', fontWeight: 700 }}>Rs {Number(data.grossSales || 0).toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Tax Collected (Historical)</div>
          <div style={{ color: 'var(--accent-blue)', fontSize: '32px', fontWeight: 700 }}>Rs {Number(data.taxCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Successful Orders</div>
          <div style={{ color: 'var(--accent-blue)', fontSize: '32px', fontWeight: 700 }}>{data.totalOrders || 0}</div>
        </div>
         <div className="glass-panel" style={{ padding: '24px' }}>
             <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Cancelled Orders</div>
             <div style={{ color: 'var(--accent-pink)', fontSize: '32px', fontWeight: 700 }}>{data.cancelledOrders || 0}</div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Order Status Breakdown</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(var(--accent-blue) 0% 85%, var(--accent-pink) 85% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-dark)' }} />
            </div>
            <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent-blue)' }}/> <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Successful (85%)</span></div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent-pink)' }}/> <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Cancelled (15%)</span></div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Payment Status</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}><span>Cash / Card</span><span>80%</span></div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '80%', height: '100%', background: 'var(--accent-green)' }}/></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}><span>Khata (Pending)</span><span>20%</span></div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '20%', height: '100%', background: 'var(--accent-pink)' }}/></div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Sales Trend (Selected Period)</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
            {displayData.slice(-7).map((val: any, i: number) => {
               // Calculate relative height for chart
               const maxRev = Math.max(...displayData.map((d: any) => Number(d.revenue)));
               const heightPct = maxRev > 0 ? (Number(val.revenue) / maxRev) * 100 : 10;
               return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${heightPct}%`, 
                  minHeight: '4px',
                  background: 'linear-gradient(to top, var(--accent-blue), var(--accent-pink))',
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.8,
                  transition: 'height 0.5s ease'
                }} title={`Rs ${val.revenue}`} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{val.date.slice(-5)}</span>
              </div>
            )})}
            {displayData.length === 0 && <div style={{ color: 'var(--text-muted)', margin: 'auto' }}>No data</div>}
          </div>
        </div>
      </div>

        <div className="glass-panel" style={{ padding: '24px', height: '300px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Detailed Sales Report</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                <th style={{ paddingBottom: '8px' }}>{displayData.length > 0 && displayData[0].date.length === 7 ? 'Month' : 'Date'}</th>
                <th style={{ paddingBottom: '8px' }}>Successful</th>
                <th style={{ paddingBottom: '8px' }}>Cancelled</th>
                <th style={{ paddingBottom: '8px' }}>Revenue</th>
                <th style={{ paddingBottom: '8px' }}>Tax Collected</th>
                <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((day: any) => (
                <tr key={day.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '12px 0' }}>{day.date}</td>
                  <td style={{ padding: '12px 0', color: 'var(--accent-green)' }}>{day.successfulOrders}</td>
                  <td style={{ padding: '12px 0', color: 'var(--accent-pink)' }}>{day.cancelledOrders}</td>
                  <td style={{ padding: '12px 0' }}>Rs {Number(day.revenue).toLocaleString()}</td>
                  <td style={{ padding: '12px 0', color: 'var(--accent-blue)' }}>Rs {Number(day.taxCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                    <button onClick={() => {
                        document.body.classList.add("printing-formal-report");
                        window.print();
                        setTimeout(() => document.body.classList.remove("printing-formal-report"), 500);
                    }} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Print Report</button>
                  </td>
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '12px 0', color: 'var(--text-muted)' }}>No data for selected period</td></tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
