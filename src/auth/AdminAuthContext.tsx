import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const TOKEN_KEY = "dd_admin_token";

type AdminUser = {
  adminId: string;
  email: string;
  role: string;
};

type AuthState = {
  token: string | null;
  user: AdminUser | null;
  isLoaded: boolean;
};

type AdminAuthCtx = AuthState & {
  login: (token: string) => void;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthCtx | null>(null);

/** Minimally decode JWT payload (no signature verification — backend handles that). */
function decodePayload(token: string): AdminUser | null {
  try {
    const [, payloadB64] = token.split(".");
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json);
    if (p.role !== "admin") return null;
    return { adminId: p.sub, email: p.email, role: p.role };
  } catch {
    return null;
  }
}

/** Check whether a JWT is still within its expiry window. */
function isTokenValid(token: string): boolean {
  try {
    const [, payloadB64] = token.split(".");
    const p = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (!p.exp) return true;
    return Date.now() < p.exp * 1000;
  } catch {
    return false;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoaded: false,
  });

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && isTokenValid(stored)) {
      const user = decodePayload(stored);
      setState({ token: stored, user, isLoaded: true });
    } else {
      if (stored) localStorage.removeItem(TOKEN_KEY); // expired
      setState({ token: null, user: null, isLoaded: true });
    }
  }, []);

  const login = useCallback((token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    const user = decodePayload(token);
    setState({ token, user, isLoaded: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ token: null, user: null, isLoaded: true });
    window.location.href = "/login";
  }, []);

  return (
    <AdminAuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthCtx {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}

export { TOKEN_KEY };
