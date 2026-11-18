import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { catLabel, statusLabel } from "../constants";

function Bars({ data, label }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  if (!entries.length) return <div className="empty">No data yet.</div>;
  return (
    <div className="bars">
      {entries.map(([k, v]) => (
        <div className="bar" key={k}>
          <span>{label(k)}</span>
          <div className="track"><div className="fill" style={{ width: `${(v / max) * 100}%` }} /></div>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", badgeNo: "", station: "", role: "OFFICER" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = () => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/officers").then((r) => setStaff(r.data));
  };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/officers", form);
      setForm({ name: "", email: "", password: "", badgeNo: "", station: "", role: "OFFICER" });
      load();
    } catch (err) { setError(errMsg(err)); }
  };
  const toggle = async (u) => {
    setError("");
    try { await api.put(`/admin/officers/${u.id}/active`, { active: !u.active }); load(); } catch (err) { setError(errMsg(err)); }
  };

  if (!stats) return <p className="muted">Loading…</p>;
  const tiles = [["Total reports", stats.total], ["Unassigned", stats.unassigned], ["New reporter replies", stats.newReplies], ["Active officers", stats.officers]];

  return (
    <>
      <h1>Administration</h1>
      <div className="tiles">{tiles.map(([k, v]) => <div className="tile" key={k}><b>{v}</b><span>{k}</span></div>)}</div>

      <div className="two-col">
        <div><h2>Reports by status</h2><Bars data={stats.byStatus} label={statusLabel} /></div>
        <div><h2>Reports by category</h2><Bars data={stats.byCategory} label={catLabel} /></div>
      </div>

      <h2>Staff accounts</h2>
      {error && <div className="alert error">{error}</div>}
      <div className="scroll">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Badge</th><th>Station</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.badgeNo}</td><td>{u.station}</td>
                <td>{u.active ? "Active" : "Deactivated"}</td>
                <td><button className="btn ghost small" onClick={() => toggle(u)}>{u.active ? "Deactivate" : "Reactivate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card form narrow" onSubmit={create} style={{ marginTop: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Add an officer</h2>
        <label>Full name<input value={form.name} onChange={set("name")} required /></label>
        <label>Email<input type="email" value={form.email} onChange={set("email")} required /></label>
        <label>Temporary password (8+ characters)<input type="password" value={form.password} onChange={set("password")} minLength={8} required /></label>
        <label>Badge number<input value={form.badgeNo} onChange={set("badgeNo")} /></label>
        <label>Station<input value={form.station} onChange={set("station")} /></label>
        <label>Role
          <select value={form.role} onChange={set("role")}><option value="OFFICER">Officer</option><option value="ADMIN">Admin</option></select>
        </label>
        <button className="btn">Create account</button>
      </form>
    </>
  );
}
