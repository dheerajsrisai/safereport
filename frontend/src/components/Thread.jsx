import { useState } from "react";
import { fmt } from "../constants";

/** Message list plus a reply box. `mine(m)` says which messages belong on the right side. */
export default function Thread({ messages, mine, label, onSend, placeholder, button }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await onSend(text); setText(""); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="thread">
        {messages.length === 0 && <div className="empty">No messages yet.</div>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${mine(m) ? "mine" : "theirs"}`}>
            <span className="msg-meta">{label(m)} · {fmt(m.createdAt)}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="reply" onSubmit={send}>
        <textarea rows={2} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
        <button className="btn" disabled={busy || !text.trim()}>{button}</button>
      </form>
    </div>
  );
}
