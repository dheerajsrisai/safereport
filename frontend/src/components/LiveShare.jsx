import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";

const HEARTBEAT_MS = 5000;     // re-send the latest position at least this often
const MIN_GAP_MS = 4000;       // never send faster than this (server allows ~1 per 3 s)
const STALE_FIX_MS = 15000;    // if the device gave no new fix for this long, ask for one explicitly
const GEO = { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };

// A Web Worker timer is not throttled when the tab is in the background (plain setInterval is)
function makeTicker(ms, cb) {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(1), ${ms});`], { type: "text/javascript" }));
    const w = new Worker(url);
    w.onmessage = () => cb();
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  } catch {
    const id = setInterval(cb, ms);
    return () => clearInterval(id);
  }
}

/**
 * Citizen side. Sharing is opt-in and tied to the tracking code, not to an identity.
 */
export default function LiveShare({ code }) {
  const [on, setOn] = useState(false);
  const [fix, setFix] = useState(null);
  const [fixAt, setFixAt] = useState(null);
  const [sentAt, setSentAt] = useState(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(Date.now());

  const active = useRef(false);
  const latest = useRef(null);
  const latestAt = useRef(0);
  const lastSent = useRef(0);
  const watchId = useRef(null);
  const stopTicker = useRef(null);
  const wake = useRef(null);

  const lockScreen = useCallback(async () => {
    try { if ("wakeLock" in navigator) wake.current = await navigator.wakeLock.request("screen"); } catch { /* optional */ }
  }, []);

  const halt = useCallback(() => {
    active.current = false;
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    stopTicker.current?.();
    stopTicker.current = null;
    wake.current?.release?.().catch(() => {});
    wake.current = null;
    latest.current = null;
    latestAt.current = 0;
    lastSent.current = 0;
  }, []);

  const send = useCallback(async () => {
    const p = latest.current;
    if (!p || !active.current || Date.now() - lastSent.current < MIN_GAP_MS) return;
    lastSent.current = Date.now();
    try {
      await api.post("/public/track/location", { code, lat: p.latitude, lng: p.longitude, accuracy: p.accuracy });
      setSentAt(new Date());
      setCount((c) => c + 1);
      setError("");
    } catch (e) {
      const st = e.response?.status;
      if (st === 404) { halt(); setOn(false); setError("That tracking code was not found, so sharing was stopped."); }
      else if (st === 429) setError("Sending too fast. Pausing briefly.");
      else setError(`Could not reach the server${st ? ` (error ${st})` : ""}. Still trying…`);
    }
  }, [code, halt]);

  const onFix = useCallback((pos) => {
    latest.current = pos.coords;
    latestAt.current = Date.now();
    setFix(pos.coords);
    setFixAt(new Date());
    send();
  }, [send]);

  const onErr = useCallback((err) => {
    if (err.code === 1) {
      halt(); setOn(false);
      setError("Location permission was denied. Allow it in your browser's site settings and try again.");
    } else {
      setError(err.code === 2
        ? "Your device cannot determine its position right now. Check that location services (GPS or Wi-Fi location) are on."
        : "Timed out while finding your position. Still trying…");
    }
  }, [halt]);

  const heartbeat = useCallback(() => {
    if (!active.current) return;
    // Browsers may stop delivering fixes (hidden tab, stationary device), so ask explicitly when stale
    if (!latest.current || Date.now() - latestAt.current > STALE_FIX_MS)
      navigator.geolocation.getCurrentPosition(onFix, () => {}, { ...GEO, timeout: 10000 });
    send();
  }, [onFix, send]);

  const start = () => {
    setError(""); setNote("");
    if (!navigator.geolocation) return setError("This browser does not support location sharing.");
    active.current = true;
    setOn(true);
    setCount(0);
    lockScreen();
    watchId.current = navigator.geolocation.watchPosition(onFix, onErr, GEO);
    stopTicker.current = makeTicker(HEARTBEAT_MS, heartbeat);
  };

  const stop = async (erase) => {
    halt();
    setOn(false);
    setFix(null);
    try {
      await api.post("/public/track/location/stop", { code, erase });
      setNote(erase ? "Sharing stopped and your location history was erased." : "Sharing stopped. Officers can still see your last known position.");
    } catch { setError("Could not tell the server that sharing stopped."); }
  };

  // clock for the "no new position" warning
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);

  // Returning to the tab: re-acquire the screen lock and refresh the position immediately
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === "visible" && active.current) {
        lockScreen();
        navigator.geolocation.getCurrentPosition(onFix, () => {}, { ...GEO, timeout: 10000 });
      }
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [lockScreen, onFix]);

  // Tell the server if the tab is closed or navigated away while sharing
  useEffect(() => {
    const beacon = () => {
      if (active.current)
        navigator.sendBeacon("/api/public/track/location/stop", new Blob([JSON.stringify({ code, erase: false })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", beacon);
    return () => { window.removeEventListener("pagehide", beacon); beacon(); halt(); };
  }, [code, halt]);

  const fixAge = fixAt ? Math.round((now - fixAt.getTime()) / 1000) : null;

  return (
    <section className="card share">
      <h2>Share my live location</h2>
      {!on ? (
        <>
          <p className="muted">
            If you are at the scene or need officers to find you, you can let them see your position on a map.
            This is optional and off by default.
          </p>
          <ul className="small-list">
            <li>Only officers handling your report can see it, and only while you keep this page open.</li>
            <li>A location can reveal who you are. Don't share it if you want to stay completely anonymous.</li>
            <li>You can stop at any time and choose to erase everything that was saved.</li>
          </ul>
          <button className="btn" onClick={start}>Start sharing my location</button>
        </>
      ) : (
        <>
          <div className="sharing"><span className="pulse" /> Sharing live location</div>
          {fix ? (
            <p className="muted">
              Your position: {fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)} (±{Math.round(fix.accuracy)} m)
            </p>
          ) : <p className="muted">Finding your position… your browser may ask for permission.</p>}
          <p className="muted">
            {sentAt ? `Last sent ${sentAt.toLocaleTimeString()} · ${count} update${count === 1 ? "" : "s"} sent.` : "Nothing sent yet."}
          </p>
          {fixAge !== null && fixAge > 20 && (
            <div className="alert info">
              Your device hasn't reported a new position for {fixAge} s. Keep this tab open and in front, and make sure
              location services are on. Officers still see your last known position.
            </div>
          )}
          <p className="muted">Keep this page open. Browsers pause location while a tab is hidden or the screen is off.</p>
          <div className="row">
            <button className="btn" onClick={() => stop(false)}>Stop sharing</button>
            <button className="btn ghost" onClick={() => stop(true)}>Stop and erase my location history</button>
          </div>
        </>
      )}
      {error && <div className="alert error">{error}</div>}
      {note && <div className="alert info">{note}</div>}
    </section>
  );
}
