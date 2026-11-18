import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { OverviewMap } from "../components/LiveMap";
import { agoText, catLabel, secondsAgo } from "../constants";

export default function LiveOverview() {
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let stop = false;
    const load = () => api.get("/officer/live").then((r) => !stop && setItems(r.data)).catch(() => {});
    load();
    const poll = setInterval(load, 5000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => { stop = true; clearInterval(poll); clearInterval(clock); };
  }, []);

  const open = useCallback((id) => nav(`/staff/reports/${id}`), [nav]);
  if (!items) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Live map</h1>
      <p className="muted">Reporters who are sharing their location right now. Updates every 5 seconds.</p>
      <div className="live-layout">
        <OverviewMap items={items} onOpen={open} selectedId={selected} />
        <div className="live-list">
          {items.length === 0 && <div className="empty">Nobody is sharing a location at the moment.</div>}
          {items.map((it) => {
            const stale = secondsAgo(it.lastAt) > 60;
            return (
              <button key={it.id} className={`live-item ${selected === it.id ? "sel" : ""}`} onClick={() => setSelected(it.id)}>
                <strong>{it.title}</strong>
                <span className="muted">{catLabel(it.category)} · <span className={`prio p-${it.priority}`}>{it.priority}</span></span>
                <span className={stale ? "stale" : "fresh"}>{stale ? "Signal lost · " : "● Live · "}{agoText(it.lastAt)}</span>
                <span className="link" onClick={(e) => { e.stopPropagation(); open(it.id); }}>Open case</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
