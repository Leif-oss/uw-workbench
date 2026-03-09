// Temporary standalone admin setup page (no auth required)
import React from "react";
import { AdminPage } from "./AdminPage";
import AppLayout from "../layout/AppLayout";

export function AdminSetupPage() {
  return (
    <AppLayout>
      <AdminPage />
    </AppLayout>
  );
}



