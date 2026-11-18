import { useEffect, useState } from "react";
import api from "../api";

// Evidence is protected, so files are fetched with the staff token and shown from a temporary blob URL.
function Item({ reportId, ev }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let obj;
    api.get(`/officer/evidence/${reportId}/${ev.fileName}`, { responseType: "blob" })
      .then((r) => { obj = URL.createObjectURL(r.data); setUrl(obj); })
      .catch(() => setFailed(true));
    return () => obj && URL.revokeObjectURL(obj);
  }, [reportId, ev.fileName]);

  if (failed) return <div className="ev-box muted">Could not load {ev.label}</div>;
  if (!url) return <div className="ev-box muted">Loading {ev.label}…</div>;

  const kb = Math.max(1, Math.round(ev.size / 1024));
  return (
    <figure className="ev-box">
      {ev.contentType.startsWith("image/") && (
        <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={ev.label} /></a>
      )}
      {ev.contentType.startsWith("video/") && <video src={url} controls preload="metadata" />}
      {ev.contentType === "application/pdf" && (
        <a className="btn ghost" href={url} target="_blank" rel="noreferrer">Open PDF</a>
      )}
      <figcaption>{ev.label} · {kb} KB · <a href={url} download={ev.label}>Download</a></figcaption>
    </figure>
  );
}

export default function EvidenceViewer({ report }) {
  if (!report.evidence?.length) return <p className="muted">No evidence attached.</p>;
  return <div className="ev-grid">{report.evidence.map((e) => <Item key={e.fileName} reportId={report.id} ev={e} />)}</div>;
}
