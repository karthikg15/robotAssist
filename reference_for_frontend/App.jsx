import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Patients from './pages/Patients';
import Mapping from './pages/Mapping';
import Login from './pages/Login';
import Admin from './pages/Admin';
import AdminLayout from './components/AdminLayout';
import AdminAssignments from './pages/AdminAssignments';
import AdminManage from './pages/AdminManage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes with distinct layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Admin />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="manage" element={<AdminManage />} />
        </Route>

        {/* Main Application Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="mapping" element={<Mapping />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
