import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { apiUrl } from "../config";
export function AttendanceManagement() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState({});
    const [staffList, setStaffList] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        const role = localStorage.getItem('zenpos_role') || '';
        const currentId = localStorage.getItem('zenpos_userId');
        const currentName = localStorage.getItem('zenpos_userName') || '';
        if (['MASTER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
            fetch(apiUrl("/staff"), {
                headers: { "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` }
            })
                .then(res => res.json())
                .then(data => {
                if (Array.isArray(data))
                    setStaffList(data);
            })
                .catch(err => console.error(err));
        }
        else {
            setStaffList([{ id: currentId ? Number(currentId) : 999, fullName: currentName, role: role, shift: "All Day" }]);
        }
    }, []);
    const fetchAttendance = () => {
        fetch(`${apiUrl("/staff/attendance")}?date=${date}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` }
        })
            .then(res => res.json())
            .then(data => {
            if (data && !data.message) {
                setAttendance(data);
            }
            else {
                setAttendance({});
            }
        })
            .catch(err => console.error(err));
    };
    useEffect(() => {
        fetchAttendance();
    }, [date]);
    const handleCheckIn = async (id) => {
        try {
            await fetch(apiUrl("/staff/attendance/check-in"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}`
                },
                body: JSON.stringify({ staffId: id, date })
            });
            fetchAttendance();
        }
        catch (err) {
            console.error("Failed to check in:", err);
        }
    };
    const handleCheckOut = async (id) => {
        try {
            await fetch(apiUrl("/staff/attendance/check-out"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}`
                },
                body: JSON.stringify({ staffId: id, date })
            });
            fetchAttendance();
        }
        catch (err) {
            console.error("Failed to check out:", err);
        }
    };
    const markStatus = async (id, status) => {
        const currentStatus = attendance[id]?.status;
        const newStatus = currentStatus === status ? '' : status;
        try {
            await fetch(apiUrl("/staff/attendance"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}`
                },
                body: JSON.stringify({ staffId: id, date, status: newStatus })
            });
            fetchAttendance();
        }
        catch (err) {
            console.error("Failed to sync status:", err);
        }
    };
    const formatTime = (isoString) => {
        if (!isoString)
            return "--:--";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    return (_jsxs("div", { className: "glass-panel", style: { padding: '24px', minHeight: '80vh' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: '28px', color: 'var(--text-main)' }, children: "Staff Attendance" }), _jsxs("p", { style: { color: 'var(--text-muted)', margin: '4px 0 0 0' }, children: [currentTime.toLocaleTimeString(), " \u2022 ", currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }, children: [_jsx("label", { style: { color: 'var(--text-muted)', fontSize: '14px' }, children: "Viewing Date:" }), _jsx("input", { type: "date", value: date, onChange: e => setDate(e.target.value), style: { padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text-main)', outline: 'none', fontWeight: 'bold' } })] })] }), _jsx("div", { className: "table-container", style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', textAlign: 'left', borderCollapse: 'separate', borderSpacing: '0 8px' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }, children: [_jsx("th", { style: { padding: '12px 16px' }, children: "Staff Member" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Shift" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Check In" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Check Out" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Current Status" }), _jsx("th", { style: { padding: '12px 16px', textAlign: 'right' }, children: "Actions" })] }) }), _jsx("tbody", { children: staffList.map(s => {
                                const entry = attendance[s.id] || {};
                                return (_jsxs("tr", { className: "attendance-row", style: { background: 'rgba(255,255,255,0.02)', transition: '0.3s' }, children: [_jsxs("td", { style: { padding: '16px', borderRadius: '12px 0 0 12px' }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: '16px' }, children: s.fullName || s.name }), _jsx("div", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: s.role })] }), _jsx("td", { style: { padding: '16px', color: 'var(--text-muted)' }, children: s.shift || "All Day" }), _jsx("td", { style: { padding: '16px' }, children: _jsx("div", { style: { fontSize: '16px', fontWeight: 500, color: entry.checkIn ? '#00ff66' : 'var(--text-muted)' }, children: formatTime(entry.checkIn) }) }), _jsx("td", { style: { padding: '16px' }, children: _jsx("div", { style: { fontSize: '16px', fontWeight: 500, color: entry.checkOut ? '#ffc800' : 'var(--text-muted)' }, children: formatTime(entry.checkOut) }) }), _jsx("td", { style: { padding: '16px' }, children: _jsx("span", { style: {
                                                    padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                                                    background: entry.status === 'Present' ? 'rgba(0,255,102,0.1)' : entry.status === 'Absent' ? 'rgba(255,0,127,0.1)' : entry.status === 'Late' ? 'rgba(255,200,0,0.1)' : 'rgba(255,255,255,0.05)',
                                                    color: entry.status === 'Present' ? '#00ff66' : entry.status === 'Absent' ? '#ff007f' : entry.status === 'Late' ? '#ffc800' : 'var(--text-muted)',
                                                    border: `1px solid ${entry.status === 'Present' ? '#00ff6633' : entry.status === 'Absent' ? '#ff007f33' : entry.status === 'Late' ? '#ffc80033' : 'transparent'}`
                                                }, children: entry.status || 'Not Marked' }) }), _jsx("td", { style: { padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'right' }, children: _jsxs("div", { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }, children: [!entry.checkIn ? (_jsx("button", { onClick: () => handleCheckIn(s.id), className: "attendance-btn check-in", children: "Check In" })) : !entry.checkOut ? (_jsx("button", { onClick: () => handleCheckOut(s.id), className: "attendance-btn check-out", children: "Check Out" })) : (_jsx("span", { style: { fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }, children: "Shift Completed" })), _jsx("div", { style: { width: '1px', background: 'var(--border-glass)', margin: '0 4px' } }), _jsxs("div", { className: "status-toggle-group", children: [_jsx("button", { onClick: () => markStatus(s.id, 'Late'), style: { background: entry.status === 'Late' ? '#ffc80022' : 'transparent', border: '1px solid #ffc800', color: '#ffc800' }, className: "status-btn", children: "L" }), _jsx("button", { onClick: () => markStatus(s.id, 'Absent'), style: { background: entry.status === 'Absent' ? '#ff007f22' : 'transparent', border: '1px solid #ff007f', color: '#ff007f' }, className: "status-btn", children: "A" })] })] }) })] }, s.id));
                            }) })] }) }), _jsx("style", { children: `
        .attendance-row:hover {
          background: rgba(255,255,255,0.05) !important;
          transform: translateY(-1px);
        }
        .attendance-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-weight: bold;
          cursor: pointer;
          transition: 0.2s;
        }
        .check-in {
          background: #00ff66;
          color: #000;
        }
        .check-in:hover {
          background: #00cc52;
          box-shadow: 0 0 15px rgba(0,255,102,0.3);
        }
        .check-out {
          background: #ffc800;
          color: #000;
        }
        .check-out:hover {
          background: #e6b400;
          box-shadow: 0 0 15px rgba(255,200,0,0.3);
        }
        .status-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }
        .status-toggle-group {
          display: flex;
          gap: 4px;
        }
      ` })] }));
}
