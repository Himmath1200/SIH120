import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import WellMonitoring from "./pages/WellMonitoring";
import Simulation from "./pages/Simulation";
import CssOptimization from "./pages/CssOptimization";
import SrpOptimization from "./pages/SrpOptimization";
import Production from "./pages/Production";
import FailurePrediction from "./pages/FailurePrediction";
import Energy from "./pages/Energy";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/well-monitoring" element={<WellMonitoring />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/css-optimization" element={<CssOptimization />} />
        <Route path="/srp-optimization" element={<SrpOptimization />} />
        <Route path="/production" element={<Production />} />
        <Route path="/failure-prediction" element={<FailurePrediction />} />
        <Route path="/energy" element={<Energy />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
