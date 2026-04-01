import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vault } from './pages/Vault';
import { Federated } from './pages/Federated';
import { Governance } from './pages/Governance';
import { Adversarial } from './pages/Adversarial';
import { Onboarding } from './pages/Onboarding';
import { Ops } from './pages/Ops';
import { Toast } from './components/ui/Toast';
import { useVaultSync } from './hooks/useVaultSync';

export const App: React.FC = () => {
  useVaultSync();

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/vault" element={<Vault />} />
                  <Route path="/federation" element={<Federated />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/adversarial" element={<Adversarial />} />
                  <Route path="/ops" element={<Ops />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </AnimatePresence>
      <Toast />
    </BrowserRouter>
  );
};
