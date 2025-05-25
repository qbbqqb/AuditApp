import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import FindingsList from './components/findings/FindingsList';
import FindingDetail from './components/findings/FindingDetail';
import CreateFinding from './components/findings/CreateFinding';
import ReportBuilder from './components/reports/ReportBuilder';
import Dashboard from './components/dashboard/Dashboard';
import SupabaseTest from './components/SupabaseTest';
import ConnectionTest from './components/ConnectionTest';
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import ProjectManagement from './components/admin/ProjectManagement';
import ProjectAssignments from './components/admin/ProjectAssignments';
import AdvancedAnalytics from './components/analytics/AdvancedAnalytics';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder components (will be enhanced in later phases)
const Reports = () => (
  <div className="px-4 py-6 sm:px-0">
    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Reports</h1>
      <p className="text-gray-600">Advanced reporting and analytics coming in Phase 4...</p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/test" element={<SupabaseTest />} />
            <Route path="/connection-test" element={<ConnectionTest />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="findings" element={<FindingsList />} />
              <Route path="findings/:id" element={<FindingDetail />} />
              <Route path="findings/new" element={<CreateFinding />} />
              <Route path="reports" element={<ReportBuilder />} />
              
              {/* Admin routes */}
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/projects" element={<ProjectManagement />} />
              <Route path="admin/assignments" element={<ProjectAssignments />} />
              <Route path="admin/analytics" element={<AdvancedAnalytics />} />
              <Route path="admin/settings" element={<div className="p-8 text-center text-gray-500">Settings coming soon...</div>} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
