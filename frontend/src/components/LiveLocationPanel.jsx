import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { TrailMap } from "./LiveMap";
import { agoText, fmt, secondsAgo } from "../constants";

/** Case page: polls the reporter's location every 5 seconds. */
export default function LiveLocationPanel({ reportId, onAsk }) {
  const [loc, setLoc] = useState(null);
  const [err, setErr] = useState("");
  const [, tick] = useState(0);

  useEffect(() => {
    let stop = false;
    const load = () => api.get(`/officer/reports/${reportId}/location`)
      .then((r) => { if (!stop) { setLoc(r.data); setErr(""); } })
      .catch((e) => { if (!stop) setErr(errMsg(e)); });
    load();
    const poll = setInterval(load, 5000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);   // keeps "x seconds ago" fresh
    return () => { stop = true; clearInterval(poll); clearInterval(clock); };
  }, [reportId]);

  if (!loc) return err ? <div className="alert error">Live location could not be loaded: {err}</div> : null;
  const age = secondsAgo(loc.lastAt);
  const live = loc.sharing && age !== null && age < 60;

  return (
    <>
      <div className="row between">
        <h2>Live location</h2>
        {loc.current ? (
          <span className={`badge ${live ? "s-LIVE" : "s-REJECTED"}`}>
            {live ? "● Live" : loc.sharing ? "Signal lost" : "Not sharing"} · updated {agoText(loc.lastAt)}
          </span>
        ) : <span className="badge s-REJECTED">Not shared</span>}
      </div>
      {err && <div className="alert error">Connection problem, retrying… ({err})</div>}

      {loc.current ? (
        <>
          <TrailMap current={loc.current} trail={loc.trail} live={live} />
          <p className="muted">
            {loc.current.lat.toFixed(5)}, {loc.current.lng.toFixed(5)}
            {loc.current.accuracy ? ` · accuracy ±${Math.round(loc.current.accuracy)} m` : ""} · {loc.trail.length} trail points · last update {fmt(loc.lastAt)}
          </p>
          {live && loc.trail.length <= 1 && (
            <p className="muted">The dot only moves when the reporter's position changes. If they are testing on a desktop computer, the position stays the same.</p>
          )}
          <p className="muted"><a href={`https://www.openstreetmap.org/?mlat=${loc.current.lat}&mlon=${loc.current.lng}#map=17/${loc.current.lat}/${loc.current.lng}`} target="_blank" rel="noreferrer">Open in OpenStreetMap</a></p>
        </>
      ) : (
        <div className="empty">
          The reporter has not shared a location.
          <div className="row"><button className="btn ghost small" onClick={onAsk}>Ask the reporter to share it</button></div>
        </div>
      )}
    </>
  );
}
