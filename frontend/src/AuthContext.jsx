import { createContext, useContext, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem("staffUser") || "null"));

  const login = async (email, password) => {
    const data = (await api.post("/auth/login", { email, password })).data;
    sessionStorage.setItem("staffToken", data.token);
    sessionStorage.setItem("staffUser", JSON.stringify(data));
    setUser(data);
    return data;
  };
  const logout = () => {
    sessionStorage.removeItem("staffToken");
    sessionStorage.removeItem("staffUser");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
