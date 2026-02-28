import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./auth/AdminAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shipments from "./pages/Shipments";
import Customers from "./pages/Customers";
import DriverApplications from "./pages/Drivers";
import DriversOverview from "./pages/drivers/Overview";
import DriversDispatch from "./pages/drivers/Dispatch";
import DriversDirectory from "./pages/drivers/Directory";

function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* All admin routes require a valid admin JWT */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/drivers" element={<DriversOverview />} />
          <Route path="/drivers/applications" element={<DriverApplications />} />
          <Route path="/drivers/dispatch" element={<DriversDispatch />} />
          <Route path="/drivers/directory" element={<DriversDirectory />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

export default App;
