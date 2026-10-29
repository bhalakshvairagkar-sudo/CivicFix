import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import MapExplorer from './pages/MapExplorer';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import ReportsPage from './pages/ReportsPage';
import AssetMemoryPage from './pages/AssetMemoryPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AuditTrailPage from './pages/AuditTrailPage';
import DBMSInsightsPage from './pages/DBMSInsightsPage';
import LoginPage from './pages/LoginPage';

function MainApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  if (!user) {
    return <LoginPage onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  const handleSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setActiveTab('case_detail');
  };

  const handleBackToCases = () => {
    setSelectedCaseId(null);
    setActiveTab('cases');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Top Navbar */}
      <Navbar onOpenReportModal={() => setActiveTab('reports')} />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectCase={handleSelectCase}
            />
          )}

          {activeTab === 'map' && (
            <MapExplorer onSelectCase={handleSelectCase} />
          )}

          {activeTab === 'cases' && (
            <CasesPage onSelectCase={handleSelectCase} />
          )}

          {activeTab === 'case_detail' && (
            <CaseDetailPage
              caseId={selectedCaseId}
              onBack={handleBackToCases}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage onSelectCase={handleSelectCase} />
          )}

          {activeTab === 'assets' && (
            <AssetMemoryPage />
          )}

          {activeTab === 'work_orders' && (
            <WorkOrdersPage onSelectCase={handleSelectCase} />
          )}

          {activeTab === 'departments' && (
            <DepartmentsPage />
          )}

          {activeTab === 'audit' && (
            <AuditTrailPage />
          )}

          {activeTab === 'dbms_insights' && (
            <DBMSInsightsPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
