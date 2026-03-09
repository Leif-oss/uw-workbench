import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AgenciesPage from "./pages/AgenciesPage";
import EmployeesPage from "./pages/EmployeesPage";
import OfficesPage from "./pages/OfficesPage";
import WorkbenchPage from "./pages/WorkbenchPage";
import TasksPage from "./pages/TasksPage";
import AdminPage from "./pages/AdminPage";
import { AdminSetupPage } from "./pages/AdminSetupPage";
import CrmHomePage from "./pages/CrmHomePage";
import CrmUnderwritersPage from "./pages/CrmUnderwritersPage";
import CrmReportsPage from "./pages/CrmReportsPage";
import MarketingToolsPage from "./pages/MarketingToolsPage";
import AgencyResearchPage from "./pages/AgencyResearchPage";
import AgentSearchPage from "./pages/AgentSearchPage";
import CrmOfficeDetailPage from "./pages/CrmOfficeDetailPage";
import CrmAgencyDetailPage from "./pages/CrmAgencyDetailPage";
import ReinsuranceCalculatorPage from "./pages/ReinsuranceCalculatorPage";
import DocumentScrubberPage from "./pages/DocumentScrubberPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import DraftIntakePage from "./pages/DraftIntakePage";
import EmailToolsPage from "./pages/EmailToolsPage";
import EmailBuilderPage from "./pages/EmailBuilderPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SetPasswordPage from "./pages/SetPasswordPage";

function ProtectedLayout() {
  const isAuthenticated = !!localStorage.getItem("auth_token");
  const location = window.location.pathname;
  
  // Require authentication for all routes
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout />;
}

function AdminRoute({ children }: { children: React.ReactElement }) {
  const isAdmin = localStorage.getItem("is_admin") === "true";
  
  // Require admin access
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crm" element={<Navigate to="/crm/offices" replace />} />
        <Route path="/crm/offices" element={<CrmHomePage />} />
        <Route path="/crm/offices/:officeId" element={<CrmOfficeDetailPage />} />
        <Route path="/crm/agencies" element={<AgenciesPage />} />
        <Route path="/crm/agencies/:agencyId" element={<CrmAgencyDetailPage />} />
        <Route path="/crm/underwriters" element={<CrmUnderwritersPage />} />
        <Route path="/crm/employees" element={<EmployeesPage />} />
        <Route path="/crm/reports" element={<Navigate to="/crm/marketing-tools" replace />} />
        <Route path="/crm/marketing-tools" element={<MarketingToolsPage />} />
        <Route path="/crm/email-tools" element={<EmailToolsPage />} />
        <Route path="/crm/email-builder" element={<EmailBuilderPage />} />
        <Route path="/crm/agency-research" element={<AgencyResearchPage />} />
        <Route path="/crm/agent-search" element={<AgentSearchPage />} />
        <Route path="/agencies" element={<AgenciesPage />} />
        <Route path="/employees" element={<Navigate to="/crm/employees" replace />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/workbench/reinsurance-calculator" element={<ReinsuranceCalculatorPage />} />
        <Route path="/workbench/document-scrubber" element={<DocumentScrubberPage />} />
        <Route path="/workbench/ai-assistant" element={<AiAssistantPage />} />
        <Route path="/workbench/draft-intake" element={<DraftIntakePage />} />
        <Route path="/workbench/email-tools" element={<Navigate to="/crm/email-tools" replace />} /> {/* Legacy route - redirects to /crm/email-tools */}
        <Route path="/tasks" element={<TasksPage />} />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
