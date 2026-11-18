export const CATEGORIES = [
  ["THEFT", "Theft or burglary"], ["ASSAULT", "Assault or violence"], ["FRAUD", "Fraud or scam"],
  ["CYBERCRIME", "Cybercrime"], ["HARASSMENT", "Harassment or stalking"], ["DRUGS", "Drug activity"],
  ["CORRUPTION", "Corruption or bribery"], ["VANDALISM", "Vandalism"],
  ["DOMESTIC_VIOLENCE", "Domestic violence"], ["OTHER", "Something else"],
];
export const STATUSES = [
  ["SUBMITTED", "Received"], ["UNDER_REVIEW", "Under review"], ["INVESTIGATING", "Investigating"],
  ["RESOLVED", "Resolved"], ["REJECTED", "Closed, no action"],
];
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const catLabel = (k) => (CATEGORIES.find((c) => c[0] === k) || [k, k])[1];
export const statusLabel = (k) => (STATUSES.find((s) => s[0] === k) || [k, k])[1];
// The server stores UTC and sends timestamps without a zone suffix, so add one before parsing.
export const parseTime = (d) => {
  if (!d) return null;
  if (d.length === 10) return new Date(d + "T00:00:00");           // date-only value (incident date)
  const t = d.replace(/(\.\d{3})\d+/, "$1");
  return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(t) ? t : t + "Z");
};
export const fmt = (d) => (d ? parseTime(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");
export const fmtDate = (d) => (d ? parseTime(d).toLocaleDateString([], { dateStyle: "medium" }) : "");
const serverNow = () => Date.now() + (window.__clockOffset || 0);
export const secondsAgo = (d) => (d ? Math.max(0, Math.round((serverNow() - parseTime(d).getTime()) / 1000)) : null);
export const agoText = (d) => {
  const s = secondsAgo(d);
  if (s === null) return "never";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return fmt(d);
};
// "Live" = the reporter switched sharing on and we heard from them in the last minute
export const isLive = (r) => !!r.liveSharing && secondsAgo(r.lastLocationAt) !== null && secondsAgo(r.lastLocationAt) < 60;
