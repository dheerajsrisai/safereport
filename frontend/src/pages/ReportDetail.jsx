import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../api";
import { useAuth } from "../AuthContext";
import EvidenceViewer from "../components/EvidenceViewer";
import StatusBadge from "../components/StatusBadge";
import Thread from "../components/Thread";
import LiveLocationPanel from "../components/LiveLocationPanel";
import { PRIORITIES, STATUSES, catLabel, fmt, fmtDate } from "../constants";

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [r, setR] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const apply = (data) => { setR(data); setStatus(data.status); setPriority(data.priority); };

  useEffect(() => {
    api.get(`/officer/reports/${id}`).then((x) => apply(x.data)).catch((e) => setError(errMsg(e)));
    if (user.role === "ADMIN") api.get("/admin/officers").then((x) => setOfficers(x.data.filter((o) => o.active)));
  }, [id, user.role]);

  const run = async (fn) => {
    setError("");
    try { apply((await fn()).data); return true; } catch (e) { setError(errMsg(e)); return false; }
  };

  const save = async () => { if (await run(() => api.put(`/officer/reports/${id}/status`, { status, priority }))) { setSaved(true); setTimeout(() => setSaved(false), 2000); } };

  if (error && !r) return <div className="alert error">{error} <Link to="/staff">Back to reports</Link></div>;
  if (!r) return <p className="muted">Loading…</p>;

  const notMine = r.assignedOfficerId && r.assignedOfficerId !== user.id;

  return (
    <>
      <p><Link to="/staff">← All reports</Link></p>
      <div className="row between">
        <h1>{r.title}</h1>
        <StatusBadge status={r.status} />
      </div>
      <p className="muted">
        {catLabel(r.category)} · received {fmt(r.createdAt)}
        {r.incidentDate && ` · incident on ${fmtDate(r.incidentDate)}`}{r.location && ` · ${r.location}`}
      </p>
      {error && <div className="alert error">{error}</div>}

      <div className="detail">
        <div>
          <h2>Description</h2>
          <p className="pre">{r.description}</p>
          <h2>Evidence</h2>
          <EvidenceViewer report={r} />
          <LiveLocationPanel reportId={id} onAsk={() => run(() => api.post(`/officer/reports/${id}/messages`, {
            text: "If you are safe to do so, please open the Track page and tap 'Start sharing my location' so we can find you." }))} />
        </div>

        <aside className="card side">
          <h2>Case management</h2>
          <p className="muted">Assigned to: <b>{r.assignedOfficerName || "nobody yet"}</b></p>
          {!r.assignedOfficerId && <button className="btn small" onClick={() => run(() => api.put(`/officer/reports/${id}/claim`))}>Take this case</button>}

          <label>Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={notMine && user.role !== "ADMIN"}>
              {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <button className="btn" onClick={save}>{saved ? "Saved" : "Save changes"}</button>

          {user.role === "ADMIN" && (
            <label>Assign to officer
              <select value="" onChange={(e) => e.target.value && run(() => api.put(`/admin/reports/${id}/assign`, { officerId: e.target.value }))}>
                <option value="">Choose officer…</option>
                {officers.map((o) => <option key={o.id} value={o.id}>{o.name}{o.badgeNo ? ` (${o.badgeNo})` : ""}</option>)}
              </select>
            </label>
          )}
        </aside>
      </div>

      <div className="two-col">
        <div>
          <h2>Conversation with the reporter</h2>
          <p className="muted">The reporter is anonymous and sees your messages as "Officer". Don't ask for personal details unless needed.</p>
          <Thread
            messages={r.messages}
            mine={(m) => m.fromOfficer}
            label={(m) => (m.fromOfficer ? `You / ${m.author}` : "Reporter")}
            onSend={(text) => run(() => api.post(`/officer/reports/${id}/messages`, { text }))}
            placeholder="Write a reply to the reporter…"
            button="Send to reporter"
          />
        </div>
        <div>
          <h2>Internal notes</h2>
          <p className="muted">Only staff can see these.</p>
          <Thread
            messages={r.notes}
            mine={() => false}
            label={(m) => m.author}
            onSend={(text) => run(() => api.post(`/officer/reports/${id}/notes`, { text }))}
            placeholder="Add an internal note…"
            button="Add note"
          />
        </div>
      </div>
    </>
  );
}
