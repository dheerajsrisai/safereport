import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ReportForm from "./pages/ReportForm";
import Track from "./pages/Track";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import ReportDetail from "./pages/ReportDetail";
import AdminPanel from "./pages/AdminPanel";
import LiveOverview from "./pages/LiveOverview";

function Guard({ admin, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/staff/login" replace />;
  if (admin && user.role !== "ADMIN") return <Navigate to="/staff" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportForm />} />
          <Route path="/track" element={<Track />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff" element={<Guard><StaffDashboard /></Guard>} />
          <Route path="/staff/reports/:id" element={<Guard><ReportDetail /></Guard>} />
          <Route path="/staff/live" element={<Guard><LiveOverview /></Guard>} />
          <Route path="/staff/admin" element={<Guard admin><AdminPanel /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        In immediate danger? Call your local emergency number (112 in India). SafeReport is not monitored in real time.
      </footer>
    </>
  );
}
