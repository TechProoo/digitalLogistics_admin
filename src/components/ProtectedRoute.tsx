import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthContext";

/**
 * Wraps protected routes.
 * Shows nothing while the auth state is still loading from localStorage
 * (prevents a flash-redirect on refresh).
 */
export default function ProtectedRoute() {
  const { token, isLoaded } = useAdminAuth();

  if (!isLoaded) return null; // brief flicker prevention

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
