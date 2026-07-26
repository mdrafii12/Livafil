import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OnboardingPage from './pages/OnboardingPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import MedicinesPage from './pages/MedicinesPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import BatchesPage from './pages/BatchesPage';
import MovementsPage from './pages/MovementsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ExchangePage from './pages/ExchangePage';
import RecoveryPage from './pages/RecoveryPage';
import SuperAdminPage from './pages/SuperAdminPage';
import SupportPage from './pages/SupportPage';
import BillingPage from './pages/BillingPage';
import RemindersPage from './pages/RemindersPage';
import OpdPage from './pages/OpdPage';

function Protected({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('Owner' | 'Manager' | 'Staff')[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/billing" element={<Protected><BillingPage /></Protected>} />
            <Route path="/opd" element={<Protected><OpdPage /></Protected>} />
            <Route path="/medicines" element={<Protected allowedRoles={['Owner', 'Manager', 'Staff']}><MedicinesPage /></Protected>} />
            <Route path="/reminders" element={<Protected allowedRoles={['Owner', 'Manager', 'Staff']}><RemindersPage /></Protected>} />
            <Route path="/categories" element={<Protected allowedRoles={['Owner', 'Manager', 'Staff']}><CategoriesPage /></Protected>} />
            <Route path="/suppliers" element={<Protected><SuppliersPage /></Protected>} />
            <Route path="/batches" element={<Protected><BatchesPage /></Protected>} />
            <Route path="/movements" element={<Protected><MovementsPage /></Protected>} />
            <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
            <Route path="/users" element={<Protected allowedRoles={['Owner', 'Manager']}><UsersPage /></Protected>} />
            <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
            <Route path="/exchange" element={<Protected><ExchangePage /></Protected>} />
            <Route path="/recovery" element={<Protected><RecoveryPage /></Protected>} />
            <Route path="/admin" element={<Protected allowedRoles={['Owner']}><SuperAdminPage /></Protected>} />
            <Route path="/support" element={<Protected><SupportPage /></Protected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}