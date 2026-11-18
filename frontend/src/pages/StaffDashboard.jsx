import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import StatusBadge from "../components/StatusBadge";
import { CATEGORIES, STATUSES, catLabel, fmtDate, isLive } from "../constants";

const RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function StaffDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);

  useEffect(() => { api.get("/officer/reports").then((r) => setReports(r.data)); }, []);

  const shown = useMemo(() => {
    if (!reports) return [];
    return reports
      .filter((r) => (!status || r.status === status) && (!category || r.category === category))
      .filter((r) => !mine || r.assignedOfficerId === user.id)
      .filter((r) => !q || (r.title + " " + r.description + " " + (r.location || "")).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => RANK[a.priority] - RANK[b.priority] || new Date(b.createdAt) - new Date(a.createdAt));
  }, [reports, status, category, q, mine, user.id]);

  if (!reports) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Reports</h1>
      <div className="filters">
        <input placeholder="Search title, description, location" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Assigned to me</label>
      </div>

      {shown.length === 0 ? <div className="empty">No reports match these filters.</div> : (
        <div className="scroll">
          <table className="table">
            <thead><tr><th>Report</th><th>Category</th><th>Status</th><th>Priority</th><th>Assigned to</th><th>Received</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/staff/reports/${r.id}`}><b>{r.title}</b></Link>
                    {r.reporterReplied && <span className="flag">New reply</span>}
                    {isLive(r) && <span className="flag live">● Live location</span>}
                  </td>
                  <td>{catLabel(r.category)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><span className={`prio p-${r.priority}`}>{r.priority}</span></td>
                  <td>{r.assignedOfficerName || <span className="muted">Unassigned</span>}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
