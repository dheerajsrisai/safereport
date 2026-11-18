import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PRIO_COLOR = { URGENT: "#c1121f", HIGH: "#e07a1f", MEDIUM: "#0e7c86", LOW: "#5a6783" };

function makeMap(el) {
  const map = L.map(el, { zoomControl: true }).setView([20.59, 78.96], 4);   // India overview until we have a fix
  // referrerPolicy: OSM tile servers require a Referer; only the site origin is sent
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTR, referrerPolicy: "origin" }).addTo(map);
  setTimeout(() => map.invalidateSize(), 250);   // re-measure once the page layout has settled
  return map;
}

/** One report: current position, accuracy circle and the trail so far. */
export function TrailMap({ current, trail, live }) {
  const el = useRef(null);
  const map = useRef(null);
  const group = useRef(null);
  const fitted = useRef(false);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  followRef.current = follow;

  useEffect(() => {
    map.current = makeMap(el.current);
    group.current = L.layerGroup().addTo(map.current);
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    if (!current) return;
    const pos = [current.lat, current.lng];
    const pts = (trail || []).map((p) => [p.lat, p.lng]);
    if (pts.length > 1) L.polyline(pts, { color: "#0e7c86", weight: 4, opacity: 0.7 }).addTo(g);
    if (current.accuracy) L.circle(pos, { radius: current.accuracy, color: "#0e7c86", weight: 1, fillOpacity: 0.12 }).addTo(g);
    L.circleMarker(pos, { radius: 9, color: "#ffffff", weight: 3, fillColor: live ? "#d62839" : "#6b7280", fillOpacity: 1 }).addTo(g);
    if (!fitted.current) { map.current.setView(pos, 16); fitted.current = true; }
    else if (followRef.current) map.current.panTo(pos);
  }, [current, trail, live]);

  return (
    <div>
      <div ref={el} className="map" role="img" aria-label="Map showing the reporter's location" />
      <label className="check"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Keep the map centred on the reporter</label>
    </div>
  );
}

/** Many reports at once (live overview). Popups are built with DOM nodes so report titles can never inject HTML. */
export function OverviewMap({ items, onOpen, selectedId }) {
  const el = useRef(null);
  const map = useRef(null);
  const group = useRef(null);
  const fitted = useRef(false);

  useEffect(() => {
    map.current = makeMap(el.current);
    group.current = L.layerGroup().addTo(map.current);
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    items.forEach((it) => {
      const m = L.circleMarker([it.lat, it.lng], {
        radius: it.id === selectedId ? 13 : 10, color: "#ffffff", weight: 3,
        fillColor: PRIO_COLOR[it.priority] || "#0e7c86", fillOpacity: 1,
      }).addTo(g);
      const box = document.createElement("div");
      const t = document.createElement("strong");
      t.textContent = it.title;
      const meta = document.createElement("div");
      meta.textContent = `${it.priority} priority`;
      const btn = document.createElement("button");
      btn.textContent = "Open case";
      btn.className = "btn small";
      btn.onclick = () => onOpen(it.id);
      box.append(t, meta, btn);
      m.bindPopup(box);
    });
    if (items.length && !fitted.current) {
      map.current.fitBounds(items.map((i) => [i.lat, i.lng]), { padding: [50, 50], maxZoom: 16 });
      fitted.current = true;
    }
  }, [items, selectedId, onOpen]);

  useEffect(() => {
    const it = items.find((i) => i.id === selectedId);
    if (it && map.current) map.current.setView([it.lat, it.lng], 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={el} className="map tall" role="img" aria-label="Map of reporters currently sharing their location" />;
}
