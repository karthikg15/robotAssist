import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';

const Layout = () => {
  return (
    <div className="app-container">
      <Topbar />
      <div className="main-content">
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
