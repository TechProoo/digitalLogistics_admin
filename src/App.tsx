import "./App.css";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Shipments from "./pages/Shipments";
import Customers from "./pages/Customers";
import DriverApplications from "./pages/Drivers";
import DriversOverview from "./pages/drivers/Overview";
import DriversDispatch from "./pages/drivers/Dispatch";
import DriversDirectory from "./pages/drivers/Directory";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/shipments" element={<Shipments />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/drivers" element={<DriversOverview />} />
      <Route path="/drivers/applications" element={<DriverApplications />} />
      <Route path="/drivers/dispatch" element={<DriversDispatch />} />
      <Route path="/drivers/directory" element={<DriversDirectory />} />
    </Routes>
  );
}

export default App;
