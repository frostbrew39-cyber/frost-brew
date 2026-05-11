import { useState, useEffect } from 'react';
import { apiUrl } from "../config";

export function AttendanceManagement() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<number, any>>({});
  const [staffList, setStaffList] = useState<any[]>([]);
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
        if (Array.isArray(data)) setStaffList(data);
      })
      .catch(err => console.error(err));
    } else {
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
      } else {
        setAttendance({});
      }
    })
    .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchAttendance();
  }, [date]);

  const handleCheckIn = async (id: number) => {
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
    } catch (err) {
      console.error("Failed to check in:", err);
    }
  };

  const handleCheckOut = async (id: number) => {
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
    } catch (err) {
      console.error("Failed to check out:", err);
    }
  };

  const markStatus = async (id: number, status: string) => {
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
    } catch (err) {
      console.error("Failed to sync status:", err);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-main)' }}>Staff Attendance</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{currentTime.toLocaleTimeString()} • {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Viewing Date:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text-main)', outline: 'none', fontWeight: 'bold' }} />
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <th style={{ padding: '12px 16px' }}>Staff Member</th>
              <th style={{ padding: '12px 16px' }}>Shift</th>
              <th style={{ padding: '12px 16px' }}>Check In</th>
              <th style={{ padding: '12px 16px' }}>Check Out</th>
              <th style={{ padding: '12px 16px' }}>Current Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => {
              const entry = attendance[s.id] || {};
              return (
                <tr key={s.id} className="attendance-row" style={{ background: 'rgba(255,255,255,0.02)', transition: '0.3s' }}>
                  <td style={{ padding: '16px', borderRadius: '12px 0 0 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{s.fullName || s.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.role}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{s.shift || "All Day"}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: entry.checkIn ? '#00ff66' : 'var(--text-muted)' }}>
                      {formatTime(entry.checkIn)}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: entry.checkOut ? '#ffc800' : 'var(--text-muted)' }}>
                      {formatTime(entry.checkOut)}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                      background: entry.status === 'Present' ? 'rgba(0,255,102,0.1)' : entry.status === 'Absent' ? 'rgba(255,0,127,0.1)' : entry.status === 'Late' ? 'rgba(255,200,0,0.1)' : 'rgba(255,255,255,0.05)',
                      color: entry.status === 'Present' ? '#00ff66' : entry.status === 'Absent' ? '#ff007f' : entry.status === 'Late' ? '#ffc800' : 'var(--text-muted)',
                      border: `1px solid ${entry.status === 'Present' ? '#00ff6633' : entry.status === 'Absent' ? '#ff007f33' : entry.status === 'Late' ? '#ffc80033' : 'transparent'}`
                    }}>
                      {entry.status || 'Not Marked'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!entry.checkIn ? (
                        <button onClick={() => handleCheckIn(s.id)} className="attendance-btn check-in">Check In</button>
                      ) : !entry.checkOut ? (
                        <button onClick={() => handleCheckOut(s.id)} className="attendance-btn check-out">Check Out</button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>Shift Completed</span>
                      )}
                      
                      <div style={{ width: '1px', background: 'var(--border-glass)', margin: '0 4px' }}></div>
                      
                      <div className="status-toggle-group">
                        <button onClick={() => markStatus(s.id, 'Late')} style={{ background: entry.status === 'Late' ? '#ffc80022' : 'transparent', border: '1px solid #ffc800', color: '#ffc800' }} className="status-btn">L</button>
                        <button onClick={() => markStatus(s.id, 'Absent')} style={{ background: entry.status === 'Absent' ? '#ff007f22' : 'transparent', border: '1px solid #ff007f', color: '#ff007f' }} className="status-btn">A</button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}

