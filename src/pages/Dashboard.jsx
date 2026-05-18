import React, { useState, useEffect } from 'react';
import { Heart, Thermometer, Activity, Wind, TrendingUp, TrendingDown, User, FileText, Clock, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDatabase } from '../context/DatabaseContext';

const Dashboard = () => {
  const { patients, doctors } = useDatabase();
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.patientId || '');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedPatient = patients.find(p => p.patientId === selectedPatientId);

  const filteredPatients = patients.filter(p => 
    (p.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.patientId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.personalInfo?.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fallback to select first patient in filtered list if current selected is filtered out
  useEffect(() => {
    if (filteredPatients.length > 0 && !filteredPatients.some(p => p.patientId === selectedPatientId)) {
      setSelectedPatientId(filteredPatients[0].patientId);
    }
  }, [searchTerm, filteredPatients, selectedPatientId]);

  // Resolve Doctor Name dynamically by ID
  const assignedDoc = doctors.find(d => d.doctorId === selectedPatient?.assignedStaff?.doctorId);
  const doctorName = assignedDoc ? (assignedDoc.personalInfo?.name || 'Unassigned') : 'Unassigned';

  // Format patient status
  const patientStatus = selectedPatient?.status?.emergency ? 'ALERT' : 'Stable';

  // Mock realtime data
  const [data, setData] = useState([
    { time: '10:00', heartRate: 72, temp: 98.6, spo2: 98, respRate: 16 },
    { time: '10:05', heartRate: 75, temp: 98.7, spo2: 97, respRate: 17 },
    { time: '10:10', heartRate: 74, temp: 98.6, spo2: 98, respRate: 16 },
    { time: '10:15', heartRate: 78, temp: 98.8, spo2: 96, respRate: 18 },
    { time: '10:20', heartRate: 73, temp: 98.6, spo2: 97, respRate: 16 },
    { time: '10:25', heartRate: 76, temp: 98.7, spo2: 98, respRate: 17 },
    { time: '10:30', heartRate: 75, temp: 98.6, spo2: 98, respRate: 16 },
  ]);

  const [currentMetrics, setCurrentMetrics] = useState({
    heartRate: 75,
    temp: 98.6,
    spo2: 98,
    movement: 'Resting',
    respRate: 16
  });

  // Reset metrics slightly when patient changes to simulate different live data
  useEffect(() => {
    if (selectedPatient) {
      // Map body temperature to Fahrenheit if stored in Celsius (e.g. 37C -> ~98.6F)
      const celsiusTemp = selectedPatient.vitals?.temperature || 36.8;
      const fahrenheitTemp = parseFloat(((celsiusTemp * 9/5) + 32).toFixed(1));

      setCurrentMetrics({
        heartRate: selectedPatient.vitals?.heartRate || (70 + Math.floor(Math.random() * 20)),
        temp: fahrenheitTemp,
        spo2: selectedPatient.vitals?.spo2 || 98,
        movement: selectedPatient.status?.condition === 'Critical' ? 'Restless' : 'Resting',
        respRate: selectedPatient.vitals?.respiratoryRate || 16
      });
    }
  }, [selectedPatientId, selectedPatient]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetrics(prev => ({
        ...prev,
        heartRate: prev.heartRate + (Math.floor(Math.random() * 5) - 2),
        temp: +(prev.temp + (Math.random() * 0.2 - 0.1)).toFixed(1),
        spo2: Math.min(100, Math.max(90, prev.spo2 + (Math.floor(Math.random() * 3) - 1))),
        respRate: Math.max(12, Math.min(25, prev.respRate + (Math.floor(Math.random() * 3) - 1)))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Live Patient Monitoring</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time sensor data and vitals overview.</p>
        </div>
        
        {/* Search and Patient Dropdown */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search patient or room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', 
                border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-panel)', color: 'var(--text-main)',
                boxShadow: 'var(--glass-shadow)',
                fontWeight: 500
              }}
            />
          </div>

          <select 
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            style={{ 
              padding: '10px 16px', 
              background: 'var(--bg-panel)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-main)', 
              borderRadius: '8px', 
              outline: 'none', 
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: 'var(--glass-shadow)'
            }}
          >
            {filteredPatients.length > 0 ? (
              filteredPatients.map(p => (
                <option key={p.patientId} value={p.patientId}>{p.personalInfo?.name || 'Unknown'} (Room {p.personalInfo?.roomNumber || 'N/A'})</option>
              ))
            ) : (
              <option value="" disabled>No patients found</option>
            )}
          </select>
        </div>
      </div>

      {/* Patient Information Card */}
      {selectedPatient && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderRight: '1px solid var(--border-color)', paddingRight: '2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <User size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedPatient.personalInfo?.name || 'Unknown'}</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Patient ID: {selectedPatient.patientId} • Age: {selectedPatient.personalInfo?.age || 'N/A'}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '3rem', flex: 1, alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Diagnosis / Condition
              </p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedPatient.status?.condition || 'Stable'} Observation</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Assigned
              </p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{doctorName}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} /> Status
              </p>
              <p style={{ 
                fontWeight: 600, 
                fontSize: '1.1rem', 
                color: patientStatus === 'ALERT' ? 'var(--danger)' : 'var(--success)' 
              }}>
                {patientStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Heart Rate Card */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Heart Rate</span>
            <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
              <Heart size={20} />
            </div>
          </div>
          <div className="metric-value">
            {currentMetrics.heartRate} <span className="metric-unit">BPM</span>
          </div>
          <div className="metric-trend trend-up">
            <TrendingUp size={16} />
            <span>Real-time sensor node active</span>
          </div>
        </div>

        {/* Temperature Card */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Body Temperature</span>
            <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Thermometer size={20} />
            </div>
          </div>
          <div className="metric-value">
            {currentMetrics.temp} <span className="metric-unit">°F</span>
          </div>
          <div className="metric-trend trend-neutral">
            <span>Normal range</span>
          </div>
        </div>

        {/* SpO2 Card */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Oxygen Saturation</span>
            <div className="metric-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)' }}>
              <Wind size={20} />
            </div>
          </div>
          <div className="metric-value">
            {currentMetrics.spo2} <span className="metric-unit">%</span>
          </div>
          <div className="metric-trend trend-down">
            <TrendingDown size={16} />
            <span>Stable</span>
          </div>
        </div>

        {/* Movement Card */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Patient Status</span>
            <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Activity size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>
            {currentMetrics.movement}
          </div>
          <div className="metric-trend trend-neutral">
            <span>Last moved 10m ago</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Heart Rate Chart */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Heart Rate Trends</h3>
            <select style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', outline: 'none', fontWeight: 500 }}>
              <option>Last Hour</option>
              <option>Last 6 Hours</option>
            </select>
          </div>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--danger)' }}
                />
                <Line type="monotone" dataKey="heartRate" stroke="var(--danger)" strokeWidth={3} dot={{ fill: 'var(--danger)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SpO2 Chart */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3 className="chart-title">SpO2 Levels</h3>
          </div>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Line type="monotone" dataKey="spo2" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Respiratory Rate Chart */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Respiratory Rate</h3>
          </div>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[10, 30]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--secondary)' }}
                />
                <Line type="monotone" dataKey="respRate" stroke="var(--secondary)" strokeWidth={3} dot={{ fill: 'var(--secondary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Status Section */}
        <div className="glass-panel chart-card">
          <h3 className="chart-title">Live Sensor Feed</h3>
          <div className="status-list" style={{ marginTop: '0.5rem' }}>
            <div className="status-item">
              <div className="status-item-icon">
                <Activity size={20} />
              </div>
              <div className="status-item-info">
                <h4>Ultrasonic Sensor</h4>
                <p>Range: {selectedPatient?.sensors?.ultrasonicSensor || 120} cm</p>
              </div>
            </div>
            
            <div className="status-item">
              <div className="status-item-icon" style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>
                <Wind size={20} />
              </div>
              <div className="status-item-info">
                <h4>IR Sensor Value</h4>
                <p>Reading: {selectedPatient?.sensors?.irSensor || 45} cm</p>
              </div>
            </div>

            <div className="status-item">
              <div className="status-item-icon" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }}>
                <Thermometer size={20} />
              </div>
              <div className="status-item-info">
                <h4>Camera Emotion</h4>
                <p>State: {selectedPatient?.emotion?.current || 'Neutral'} ({selectedPatient?.emotion?.confidence || 90}% confidence)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
