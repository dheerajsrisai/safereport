import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">Safe<b>Report</b></Link>
        <nav className="nav-links">
          {user ? (
            <>
              <NavLink to="/staff" end>Reports</NavLink>
              <NavLink to="/staff/live">Live map</NavLink>
              {user.role === "ADMIN" && <NavLink to="/staff/admin">Admin</NavLink>}
            </>
          ) : (
            <>
              <NavLink to="/report">Report a crime</NavLink>
              <NavLink to="/track">Track a report</NavLink>
            </>
          )}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span>{user.name} · {user.role === "ADMIN" ? "Admin" : "Officer"}</span>
              <button className="btn ghost small" onClick={() => { logout(); nav("/"); }}>Log out</button>
            </>
          ) : (
            <NavLink to="/staff/login" className="staff-link">Staff login</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
