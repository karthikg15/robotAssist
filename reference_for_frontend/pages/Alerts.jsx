import React, { useState } from 'react';
import { AlertTriangle, Clock, HeartPulse, Activity, WifiOff, Thermometer, User, MapPin } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import './Alerts.css';

const Alerts = () => {
  const [filter, setFilter] = useState('All');

  const { patients } = useDatabase();
  const criticalPatients = patients.filter(p => p.status?.emergency);
  
  // Use real patient data for the first two alerts if available, else fallbacks
  const p1 = criticalPatients[0] || patients[0];
  const p2 = criticalPatients[1] || patients[1];
  const p3 = patients[2];

  const p1Name = p1?.personalInfo?.name || 'Unknown Patient';
  const p1Hr = p1?.vitals?.heartRate || 75;
  const p1Room = p1?.personalInfo?.roomNumber || 'N/A';

  const p2Name = p2?.personalInfo?.name || 'Unknown Patient';
  const p2Room = p2?.personalInfo?.roomNumber || 'N/A';

  const p3Name = p3?.personalInfo?.name || 'Unknown Patient';
  const p3Room = p3?.personalInfo?.roomNumber || 'N/A';

  const alertsData = [
    {
      id: 1,
      type: 'critical',
      title: 'Abnormal Heart Rate Detected',
      description: `Patient heart rate spiked to ${p1Hr} BPM and has remained elevated. Immediate intervention recommended.`,
      time: 'Just now',
      patientName: p1Name,
      roomNumber: p1Room,
      icon: <HeartPulse size={24} />,
      status: 'active'
    },
    {
      id: 2,
      type: 'critical',
      title: 'Fall Detection Warning',
      description: 'Sudden downward movement detected by ultrasonic sensors. Patient may have fallen near the bed.',
      time: '5 minutes ago',
      patientName: p2Name,
      roomNumber: p2Room,
      icon: <Activity size={24} />,
      status: 'active'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Elevated Temperature',
      description: 'Patient body temperature recorded at 101.2°F. Continuous monitoring initiated.',
      time: '15 minutes ago',
      patientName: p3Name,
      roomNumber: p3Room,
      icon: <Thermometer size={24} />,
      status: 'acknowledged'
    }
  ];

  const filteredAlerts = alertsData.filter(alert => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return alert.type === 'critical';
    if (filter === 'Active') return alert.status === 'active';
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Emergency Alert System</h1>
        <p style={{ color: 'var(--text-muted)' }}>Real-time critical notifications and system warnings.</p>
      </div>

      <div className="alert-filters">
        <button 
          className={`filter-btn ${filter === 'All' ? 'active' : ''}`}
          onClick={() => setFilter('All')}
        >
          All Alerts
        </button>
        <button 
          className={`filter-btn critical ${filter === 'Critical' ? 'active' : ''}`}
          onClick={() => setFilter('Critical')}
        >
          Critical Only
        </button>
        <button 
          className={`filter-btn ${filter === 'Active' ? 'active' : ''}`}
          onClick={() => setFilter('Active')}
        >
          Active / Unresolved
        </button>
      </div>

      <div className="alerts-list">
        {filteredAlerts.map(alert => (
          <div key={alert.id} className={`glass-panel alert-card ${alert.type}`}>
            <div className="alert-icon-wrapper">
              {alert.icon}
            </div>
            
            <div className="alert-content">
              <div className="alert-header">
                <h3 className="alert-title">{alert.title}</h3>
                <span className="alert-time">
                  <Clock size={14} />
                  {alert.time}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={14} color="var(--primary)" />
                  {alert.patientName}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} color="var(--warning)" />
                  Room {alert.roomNumber}
                </span>
              </div>

              <p className="alert-description">{alert.description}</p>
              
              <div className="alert-actions">
                {alert.status === 'active' && (
                  <button className="alert-btn btn-danger">Respond Immediately</button>
                )}
                {alert.status !== 'resolved' && (
                  <button className="alert-btn btn-outline">Acknowledge</button>
                )}
                <button className="alert-btn btn-outline">View Details</button>
              </div>
            </div>
            
            {alert.type === 'critical' && alert.status === 'active' && (
              <div style={{ alignSelf: 'center', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <AlertTriangle size={20} />
                Requires Action
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Alerts;
