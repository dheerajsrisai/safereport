import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { errMsg } from "../api";

export default function StaffLogin() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/staff" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try { await login(email, password); nav("/staff"); } catch (err) { setError(errMsg(err)); }
  };

  return (
    <form className="card form narrow" onSubmit={submit}>
      <h1>Staff login</h1>
      <p className="muted">For police officers and administrators. Citizens don't need an account.</p>
      {error && <div className="alert error">{error}</div>}
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button className="btn">Log in</button>
    </form>
  );
}
