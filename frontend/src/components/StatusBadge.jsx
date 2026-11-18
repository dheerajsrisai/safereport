import { statusLabel } from "../constants";

export default function StatusBadge({ status }) {
  return <span className={`badge s-${status}`}>{statusLabel(status)}</span>;
}
