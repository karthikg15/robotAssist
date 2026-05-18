import React, { useState } from 'react';
import { AlertTriangle, Clock, HeartPulse, Activity, Thermometer, User, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import './Alerts.css';

const Alerts = () => {
  const [filter, setFilter] = useState('Active'); // Default to showing active unresolved alerts first
  const { alerts, resolveAlert, patients } = useDatabase();

  const getAlertIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'heartrate':
      case 'pulse':
        return <HeartPulse size={24} />;
      case 'temperature':
      case 'fever':
        return <Thermometer size={24} />;
      case 'spo2':
      case 'oxygen':
        return <ShieldAlert size={24} />;
      case 'fall':
      case 'movement':
        return <Activity size={24} />;
      default:
        return <AlertTriangle size={24} />;
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'severity-critical';
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
    } catch (err) {
      alert('Failed to resolve alert.');
    }
  };

  // Filter alerts based on active selection
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return alert.severity?.toLowerCase() === 'critical';
    if (filter === 'Active') return !alert.resolved;
    if (filter === 'Resolved') return alert.resolved;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Emergency Alert System</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time critical medical alerts and telemetry trigger logs.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }} className="alert-stats-header">
          <div className="alert-stat-box critical">
            <span className="count">{alerts.filter(a => !a.resolved && a.severity?.toLowerCase() === 'critical').length}</span>
            <span className="label">Unresolved Critical</span>
          </div>
          <div className="alert-stat-box active">
            <span className="count">{alerts.filter(a => !a.resolved).length}</span>
            <span className="label">Total Active Alerts</span>
          </div>
        </div>
      </div>

      <div className="alert-filters">
        <button 
          className={`filter-btn ${filter === 'Active' ? 'active' : ''}`}
          onClick={() => setFilter('Active')}
        >
          Active / Unresolved ({alerts.filter(a => !a.resolved).length})
        </button>
        <button 
          className={`filter-btn critical ${filter === 'Critical' ? 'active' : ''}`}
          onClick={() => setFilter('Critical')}
        >
          Critical Only ({alerts.filter(a => !a.resolved && a.severity?.toLowerCase() === 'critical').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'Resolved' ? 'active' : ''}`}
          onClick={() => setFilter('Resolved')}
        >
          Resolved Archive ({alerts.filter(a => a.resolved).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'All' ? 'active' : ''}`}
          onClick={() => setFilter('All')}
        >
          All Alerts ({alerts.length})
        </button>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success)', marginBottom: '1rem', opacity: 0.8 }} />
            <h3>All Systems nominal</h3>
            <p style={{ marginTop: '0.5rem' }}>No alerts match your current filter parameters.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const patient = patients.find(p => p.patientId === alert.patientId);
            const room = patient?.personalInfo?.roomNumber || 'N/A';
            const alertDate = new Date(alert.timestamp);
            const timeFormatted = isNaN(alertDate.getTime()) ? alert.timestamp : alertDate.toLocaleTimeString();

            return (
              <div key={alert.alertId} className={`glass-panel alert-card ${alert.resolved ? 'resolved' : alert.severity?.toLowerCase()}`}>
                <div className="alert-icon-wrapper">
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="alert-content">
                  <div className="alert-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 className="alert-title">{alert.type?.toUpperCase()} Alert</h3>
                      <span className={`severity-badge ${getSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <span className="alert-time">
                      <Clock size={14} />
                      {timeFormatted}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} style={{ color: 'var(--primary)' }} />
                      Patient: {alert.patientName || 'Unknown'} ({alert.patientId})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} style={{ color: 'var(--warning)' }} />
                      Room: {room}
                    </span>
                  </div>

                  <p className="alert-description">
                    Critical vitals boundary violation detected:
                    {alert.vitals?.heartRate && ` Heart Rate is at ${alert.vitals.heartRate} BPM (normal: 60-100).`}
                    {alert.vitals?.temperature && ` Body Temperature is at ${alert.vitals.temperature}°C (normal: 36.5-37.5).`}
                    {alert.vitals?.spo2 && ` Oxygen Saturation (SpO2) dropped to ${alert.vitals.spo2}% (critical: <95%).`}
                    {alert.vitals?.respirationRate && ` Respiratory Rate is at ${alert.vitals.respirationRate} BPM.`}
                    {!alert.vitals?.heartRate && !alert.vitals?.temperature && !alert.vitals?.spo2 && ' Patient fall or erratic motion sensor readings triggered telemetry warning.'}
                  </p>
                  
                  <div className="alert-actions">
                    {!alert.resolved ? (
                      <>
                        <button 
                          className="alert-btn btn-danger" 
                          onClick={() => handleResolve(alert.alertId)}
                        >
                          Acknowledge & Resolve
                        </button>
                        <button className="alert-btn btn-outline" disabled>
                          Dispatch Robot Assist
                        </button>
                      </>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600 }}>
                        <CheckCircle2 size={16} /> Resolved
                      </span>
                    )}
                  </div>
                </div>
                
                {!alert.resolved && (
                  <div style={{ alignSelf: 'center', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <AlertTriangle size={20} className="pulse" />
                    Requires Action
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alerts;
