import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AgenciesPage from "./pages/AgenciesPage";
import EmployeesPage from "./pages/EmployeesPage";
import OfficesPage from "./pages/OfficesPage";
import WorkbenchPage from "./pages/WorkbenchPage";
import TasksPage from "./pages/TasksPage";
import AdminPage from "./pages/AdminPage";
import CrmHomePage from "./pages/CrmHomePage";
import CrmUnderwritersPage from "./pages/CrmUnderwritersPage";
import CrmReportsPage from "./pages/CrmReportsPage";
import CrmOfficeDetailPage from "./pages/CrmOfficeDetailPage";
import CrmAgencyDetailPage from "./pages/CrmAgencyDetailPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crm" element={<Navigate to="/crm/offices" replace />} />
        <Route path="/crm/offices" element={<CrmHomePage />} />
        <Route path="/crm/offices/:officeId" element={<CrmOfficeDetailPage />} />
        <Route path="/crm/agencies" element={<AgenciesPage />} />
        <Route path="/crm/agencies/:agencyId" element={<CrmAgencyDetailPage />} />
        <Route path="/crm/underwriters" element={<CrmUnderwritersPage />} />
        <Route path="/crm/reports" element={<CrmReportsPage />} />
        <Route path="/agencies" element={<AgenciesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
