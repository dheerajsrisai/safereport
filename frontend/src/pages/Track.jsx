import { useState } from "react";
import api, { errMsg } from "../api";
import StatusBadge from "../components/StatusBadge";
import Thread from "../components/Thread";
import LiveShare from "../components/LiveShare";
import { catLabel, fmt } from "../constants";

const STEPS = [["SUBMITTED", "Received"], ["UNDER_REVIEW", "Under review"], ["INVESTIGATING", "Investigating"], ["RESOLVED", "Resolved"]];

export default function Track() {
  const [code, setCode] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      setReport((await api.post("/public/track", { code })).data);
    } catch (err) {
      setReport(null);
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async (text) => {
    try {
      setReport((await api.post("/public/track/message", { code, text })).data);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (!report)
    return (
      <form className="card form narrow" onSubmit={lookup}>
        <h1>Track a report</h1>
        <p className="muted">Enter the tracking code you saved when you submitted your report.</p>
        {error && <div className="alert error">{error}</div>}
        <label>Tracking code
          <input className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                 placeholder="XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} required />
        </label>
        <button className="btn" disabled={busy}>{busy ? "Looking up…" : "Check status"}</button>
      </form>
    );

  const rejected = report.status === "REJECTED";
  const current = STEPS.findIndex((s) => s[0] === report.status);

  return (
    <div className="narrow">
      <div className="row between">
        <h1>{report.title}</h1>
        <StatusBadge status={report.status} />
      </div>
      <p className="muted">{catLabel(report.category)} · submitted {fmt(report.createdAt)} · {report.evidenceCount} file{report.evidenceCount === 1 ? "" : "s"} attached</p>

      {rejected ? (
        <div className="alert info">Officers reviewed this report and closed it without further action. Check the messages below for details.</div>
      ) : (
        <ol className="stepper">
          {STEPS.map(([k, label], i) => (
            <li key={k} className={i < current ? "done" : i === current ? "now" : ""}>{label}</li>
          ))}
        </ol>
      )}

      {error && <div className="alert error">{error}</div>}
      <h2>Messages with officers</h2>
      <Thread
        messages={report.messages}
        mine={(m) => !m.fromOfficer}
        label={(m) => (m.fromOfficer ? "Officer" : "You")}
        onSend={send}
        placeholder="Add more details or answer an officer's question…"
        button="Send message"
      />
      <LiveShare code={code} />
      <div className="row">
        <button className="btn ghost small" onClick={lookup}>Refresh</button>
        <button className="btn ghost small" onClick={() => { setReport(null); setCode(""); }}>Close report</button>
      </div>
    </div>
  );
}
