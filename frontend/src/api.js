import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Staff token lives in sessionStorage, so it disappears when the tab closes.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("staffToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Remember how far this computer's clock is from the server's (Docker clocks often drift),
// so "updated 5s ago" and the Live / Signal lost state are never wrong because of clock skew.
const syncClock = (res) => {
  const d = res?.headers?.get ? res.headers.get("date") : res?.headers?.date;
  const t = d ? Date.parse(d) : NaN;
  if (!Number.isNaN(t)) window.__clockOffset = t - Date.now();
};

api.interceptors.response.use(
  (r) => { syncClock(r); return r; },
  (err) => {
    syncClock(err.response);
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/auth/") && !url.includes("/public/")) {
      sessionStorage.removeItem("staffToken");
      sessionStorage.removeItem("staffUser");
      window.location.href = "/staff/login";
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e.response?.data?.message || "Something went wrong. Please try again.";
export default api;
