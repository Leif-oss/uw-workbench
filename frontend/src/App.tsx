import { Route, Routes } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AgenciesPage from "./pages/AgenciesPage";
import EmployeesPage from "./pages/EmployeesPage";
import OfficesPage from "./pages/OfficesPage";
import WorkbenchPage from "./pages/WorkbenchPage";
import TasksPage from "./pages/TasksPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/agencies" element={<AgenciesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;
