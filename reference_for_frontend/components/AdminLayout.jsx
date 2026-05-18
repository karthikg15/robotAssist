import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Shield, Users, UserPlus, LogOut, Activity, User, Database } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const AdminLayout = () => {
  const { refreshUser } = useDatabase();
  const [username, setUsername] = useState('Admin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    refreshUser();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="topbar-brand">
            <Shield size={24} style={{ color: 'var(--primary)' }} />
            <span>IRIS Admin</span>
          </div>
          
          <nav className="top-nav-links">
            <NavLink 
              to="/admin" 
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Directory Overview</span>
            </NavLink>
            
            <NavLink 
              to="/admin/assignments" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <UserPlus size={18} />
              <span>Assign Personnel</span>
            </NavLink>

            <NavLink 
              to="/admin/manage" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Database size={18} />
              <span>Manage Registry</span>
            </NavLink>
          </nav>
        </div>
        
        <div className="topbar-status">
          <div className="status-badge" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', borderColor: 'rgba(14, 165, 233, 0.2)' }}>
            Admin Privileges Active
          </div>
          
          {/* User Menu */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <div 
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '6px 12px', 
                marginLeft: '0.5rem',
                borderLeft: '1px solid var(--border-color)',
                cursor: 'pointer',
                borderRadius: '8px',
                background: showUserMenu ? 'rgba(0,0,0,0.03)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { if (!showUserMenu) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
              onMouseOut={(e) => { if (!showUserMenu) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <User size={18} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, userSelect: 'none' }}>{username}</span>
            </div>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: '120%',
                right: '0',
                width: '200px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                zIndex: 100,
                padding: '8px'
              }}>
                <div style={{ padding: '8px 12px', marginBottom: '4px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Signed in as</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>{username}</div>
                </div>
                
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="main-content">
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
