import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api";
import { CATEGORIES } from "../constants";
import CameraCapture from "../components/CameraCapture";
import LiveShare from "../components/LiveShare";

const MAX_FILES = 8;
const MAX_MB = 50;
const MAX_TOTAL_MB = 150;
const ALLOWED = ["jpg", "jpeg", "png", "pdf", "mp4", "webm", "mov"];
const ext = (name) => name.split(".").pop().toLowerCase();
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Thumb({ file }) {
  const [url, setUrl] = useState(null);
  const pdf = ext(file.name) === "pdf";
  useEffect(() => {
    if (pdf) return undefined;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, pdf]);
  if (pdf) return <div className="thumb doc">PDF</div>;
  const isVideo = file.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext(file.name));
  return <div className="thumb">{url && (isVideo ? <video src={url} muted preload="metadata" /> : <img src={url} alt="" />)}</div>;
}

export default function ReportForm() {
  const [f, setF] = useState({ category: "THEFT", title: "", description: "", location: "", incidentDate: "" });
  const [files, setFiles] = useState([]);
  const [camera, setCamera] = useState(null);          // null | "photo" | "video"
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);

  const add = (picked) => {
    const bad = picked.find((x) => !ALLOWED.includes(ext(x.name)));
    if (bad) return setError(`${bad.name}: unsupported type. Allowed: JPG, PNG, PDF, MP4, MOV, WebM.`);
    const big = picked.find((x) => x.size > MAX_MB * 1048576);
    if (big) return setError(`${big.name} is larger than ${MAX_MB} MB.`);
    if (files.length + picked.length > MAX_FILES) return setError(`You can attach up to ${MAX_FILES} files.`);
    if ([...files, ...picked].reduce((s, x) => s + x.size, 0) > MAX_TOTAL_MB * 1048576) return setError(`Total size is over ${MAX_TOTAL_MB} MB.`);
    setError("");
    setFiles((prev) => [...prev, ...picked]);
  };

  const onPick = (e) => { const picked = [...e.target.files]; e.target.value = ""; add(picked); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v && fd.append(k, v));
    files.forEach((x) => fd.append("files", x));
    try {
      setCode((await api.post("/public/reports", fd)).data.trackingCode);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* ignore */ }
  };

  if (code)
    return (
      <div className="narrow">
        <h1>Report received</h1>
        <p className="lead">Save this code now. It is the only way to check your report or reply to officers, and we cannot recover it.</p>
        <div className="ticket">
          <div className="ticket-main">
            <span className="ticket-label">Your tracking code</span>
            <span className="ticket-code">{code}</span>
          </div>
          <div className="ticket-stub">
            <button className="btn" onClick={copy}>{copied ? "Copied" : "Copy code"}</button>
          </div>
        </div>
        <p className="muted">Tip: write it down or take a screenshot. Do not share it with anyone you don't trust, because anyone with the code can read the replies.</p>
        <LiveShare code={code} />
        <div className="row">
          <Link className="btn" to="/track">Track this report</Link>
          <Link className="btn ghost" to="/">Done</Link>
        </div>
      </div>
    );

  return (
    <>
      <form className="card form narrow" onSubmit={submit}>
        <h1>Report a crime</h1>
        <p className="muted">Don't include your own name or contact details unless you want officers to have them.</p>
        {error && <div className="alert error">{error}</div>}

        <label>What kind of incident was it?
          <select value={f.category} onChange={set("category")}>
            {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label>Short title
          <input value={f.title} onChange={set("title")} maxLength={150} required placeholder="e.g. Chain snatching near the bus stand" />
        </label>
        <label>What happened?
          <textarea rows={6} value={f.description} onChange={set("description")} minLength={10} maxLength={5000} required
                    placeholder="Describe who, what, when and how. Include vehicle numbers, descriptions or anything that could help." />
        </label>
        <label>Where did it happen? (optional)
          <input value={f.location} onChange={set("location")} placeholder="Street, landmark or area" />
        </label>
        <label>When did it happen? (optional)
          <input type="date" max={today} value={f.incidentDate} onChange={set("incidentDate")} />
        </label>

        <div>
          <span className="field-title">Evidence (optional)</span>
          <p className="muted">
            Up to {MAX_FILES} files, {MAX_MB} MB each. Photos from the in-app camera and JPG/PNG uploads have their location data removed.
            Videos and PDFs are stored as they are.
          </p>
          <div className="row evidence-actions">
            <button type="button" className="btn" onClick={() => setCamera("photo")}>Take photo</button>
            <button type="button" className="btn" onClick={() => setCamera("video")}>Record video</button>
            <label className="btn ghost filebtn">
              Upload files
              <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.mp4,.webm,.mov" onChange={onPick} hidden />
            </label>
          </div>
          <p className="muted">Upload accepts images (JPG, PNG), videos (MP4, MOV, WebM) and PDF documents.</p>

          {files.length > 0 && (
            <ul className="evlist">
              {files.map((x, i) => (
                <li key={i}>
                  <Thumb file={x} />
                  <div className="evinfo">
                    <span className="evname">{x.name.startsWith("photo-") ? "Photo from camera" : x.name.startsWith("video-") ? "Video from camera" : x.name}</span>
                    <span className="muted">{size(x.size)}</span>
                  </div>
                  <button type="button" className="link" onClick={() => setFiles(files.filter((_, j) => j !== i))}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="btn big" disabled={busy}>{busy ? "Uploading and submitting…" : "Submit report anonymously"}</button>
      </form>

      {camera && <CameraCapture initialMode={camera} onCapture={(file) => add([file])} onClose={() => setCamera(null)} />}
    </>
  );
}
