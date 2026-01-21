
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import MainView from './components/MainView';
import AdminAuth from './components/AdminAuth';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/admin/*" element={
          <AdminAuth>
            {(onLogout: () => void) => <AdminDashboard onLogout={onLogout} />}
          </AdminAuth>
        } />

        {/* Main View Routes */}
        <Route path="/" element={<MainView />} />
        <Route path="/college/:slug" element={<MainView />} />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </>
  );
};

export default App;
