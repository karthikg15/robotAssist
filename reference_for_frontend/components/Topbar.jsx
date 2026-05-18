import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, User, Users, Activity, AlertTriangle, Map, HeartPulse, Clock, LogOut } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const Topbar = () => {
  const { refreshUser, patients } = useDatabase();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [username, setUsername] = useState('Dr. Smith');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  // Dynamic recent alerts computed from live patient status
  const recentAlerts = patients
    .filter(p => p.status?.emergency)
    .map(p => ({
      id: p.patientId,
      title: p.vitals?.heartRate > 100 ? 'Abnormal Heart Rate' : 'Emergency Alert',
      patient: `${p.personalInfo?.name} - Room ${p.personalInfo?.roomNumber}`,
      time: 'Just now',
      type: 'critical',
      icon: <HeartPulse size={16} />
    }));

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(false);
    navigate('/alerts');
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    refreshUser();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="topbar-brand">
          <Activity size={24} />
          <span>IRIS Robot</span>
        </div>
        
        <nav className="top-nav-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Activity size={18} />
            <span>Live Monitoring</span>
          </NavLink>
          
          <NavLink 
            to="/patients" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Patient Directory</span>
          </NavLink>
          
          <NavLink 
            to="/alerts" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <AlertTriangle size={18} />
            <span>Emergency Alerts</span>
          </NavLink>
          
          <NavLink 
            to="/mapping" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Map size={18} />
            <span>Room Mapping</span>
          </NavLink>
        </nav>
      </div>
      
      <div className="topbar-status">
        <div className="status-badge">
          <div className="status-dot"></div>
          Robot Online
        </div>
        
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '0.5rem' }}>
          {time}
        </div>
        
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              background: showNotifications ? 'rgba(0,0,0,0.05)' : 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              position: 'relative',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <Bell size={20} />
            {recentAlerts.length > 0 && (
              <span style={{ position: 'absolute', top: '6px', right: '8px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-panel)' }}></span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: '0',
              width: '320px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              zIndex: 100
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>Recent Alerts</h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>{recentAlerts.length} New</span>
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {recentAlerts.map(alert => (
                  <div 
                    key={alert.id}
                    onClick={handleNotificationClick}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      transition: 'background 0.2s',
                      background: 'white'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', 
                      background: alert.type === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                      color: alert.type === 'critical' ? 'var(--danger)' : 'var(--warning)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                    }}>
                      {alert.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>{alert.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{alert.patient}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {alert.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div 
                onClick={handleNotificationClick}
                style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-main)' }}
              >
                View All Alerts
              </div>
            </div>
          )}
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
  );
};

export default Topbar;
