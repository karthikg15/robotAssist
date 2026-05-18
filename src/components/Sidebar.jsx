import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, AlertTriangle, LineChart, Map, Settings, Shield } from 'lucide-react';

const Sidebar = () => {
  const username = localStorage.getItem('username');
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Activity size={28} />
        <span>IRIS Robot</span>
      </div>
      
      <nav className="nav-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Activity size={20} />
          <span>Live Monitoring</span>
        </NavLink>
        
        <NavLink 
          to="/alerts" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <AlertTriangle size={20} />
          <span>Emergency Alerts</span>
        </NavLink>
        
        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LineChart size={20} />
          <span>Patient History</span>
        </NavLink>
        
        <NavLink 
          to="/mapping" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Map size={20} />
          <span>Room Mapping</span>
        </NavLink>
        
        {username?.toLowerCase() === 'admin' && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Shield size={20} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <a href="#" className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
