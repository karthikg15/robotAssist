import React, { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { 
  Bot, MapPin, Battery, BatteryCharging, Navigation, 
  Wifi, ShieldAlert, Cpu, User, Edit3, Check, RefreshCw 
} from 'lucide-react';

const Mapping = () => {
  const { robots, allPatients, updateRobot } = useDatabase();
  const [selectedRobotId, setSelectedRobotId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ roomNumber: '', patientId: '', status: 'Online' });

  // Get selected robot object
  const selectedRobot = robots.find(r => r.robotId === selectedRobotId) || robots[0];

  // Initialize selected robot state once loaded
  useEffect(() => {
    if (robots.length > 0 && !selectedRobotId) {
      setSelectedRobotId(robots[0].robotId);
    }
  }, [robots, selectedRobotId]);

  // Sync edit form fields with selected robot
  useEffect(() => {
    if (selectedRobot) {
      setEditForm({
        roomNumber: selectedRobot.roomNumber || '',
        patientId: selectedRobot.patientId || '',
        status: selectedRobot.status || 'Online'
      });
    }
  }, [selectedRobot]);

  if (robots.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
        <p>Connecting to IRIS Robot telemetry...</p>
      </div>
    );
  }

  // Find patient assigned to selected robot
  const assignedPatient = allPatients.find(p => p.patientId === selectedRobot.patientId);

  // Core coordinates resolved directly from database
  const robotX = selectedRobot.coordinates?.x || 50;
  const robotY = selectedRobot.coordinates?.y || 50;

  // Save changes handler (Admin Operation)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsEditing(false);
    
    // Compute coordinates mapping based on assigned room number for visual representation
    let newCoords = { x: 50, y: 50 };
    if (editForm.roomNumber.includes('101') || editForm.roomNumber.includes('102')) {
      newCoords = { x: 25, y: 35 };
    } else if (editForm.roomNumber.includes('308') || editForm.roomNumber.includes('305')) {
      newCoords = { x: 75, y: 65 };
    } else if (editForm.roomNumber.includes('302')) {
      newCoords = { x: 42.5, y: 58.2 };
    }

    await updateRobot(selectedRobot.robotId, {
      roomNumber: editForm.roomNumber,
      patientId: editForm.patientId,
      status: editForm.status,
      coordinates: newCoords
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* Header section */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Robot Registry & Spatial Mapping</h1>
          <p style={{ color: 'var(--text-muted)' }}>Active backend coordinates, room assignments, and robot status logs.</p>
        </div>

        {/* Robot Quick Selector Tab Bar */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          {robots.map(r => (
            <button
              key={r.robotId}
              onClick={() => setSelectedRobotId(r.robotId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: 'none',
                background: selectedRobotId === r.robotId ? 'white' : 'transparent',
                color: selectedRobotId === r.robotId ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: selectedRobotId === r.robotId ? '0 4px 10px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Bot size={16} />
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Map Visualization Area */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Live Spatial Map &bull; {selectedRobot.name}
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> Room Location: {selectedRobot.roomNumber || 'TBD'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '50%' }}></div> Active Bot
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: '#cbd5e1', borderRadius: '4px' }}></div> Room Obstacle
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: 'var(--warning)', borderRadius: '4px' }}></div> Target Bed / Patient
              </span>
            </div>
          </div>

          {/* Map canvas */}
          <div style={{ 
            background: 'var(--bg-main)', 
            border: '2px dashed var(--border-color)', 
            borderRadius: '12px', 
            position: 'relative',
            minHeight: '400px',
            overflow: 'hidden'
          }}>
            {/* Grid overlay */}
            <div style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              opacity: 0.4
            }}></div>

            {/* Room Features (Layout Door) */}
            <div style={{ position: 'absolute', top: '10%', left: '0', width: '8px', height: '80px', background: '#cbd5e1', borderRadius: '0 4px 4px 0' }}></div> 

            {/* Obstacles (Simulated Medical Machinery / Carts) */}
            <div style={{ position: 'absolute', left: '20%', top: '25%', width: '12%', height: '10%', background: 'rgba(203, 213, 225, 0.7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>MED CART</div>
            <div style={{ position: 'absolute', left: '70%', top: '75%', width: '10%', height: '10%', background: 'rgba(203, 213, 225, 0.7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>MONITOR</div>

            {/* Target Bed Coordinates (Dynamic based on selected robot roomNumber) */}
            <div style={{
              position: 'absolute',
              left: `${selectedRobot.status === 'Docked' ? 80 : 45}%`,
              top: `${selectedRobot.status === 'Docked' ? 20 : 55}%`,
              width: '80px',
              height: '50px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--warning)',
              transition: 'all 0.5s ease-in-out'
            }}>
              <span>BED</span>
              <span>Rm {selectedRobot.roomNumber}</span>
            </div>

            {/* Live Robot Dot */}
            <div 
              style={{
                position: 'absolute',
                left: `${robotX}%`,
                top: `${robotY}%`,
                width: '36px',
                height: '36px',
                background: 'var(--primary)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 8px rgba(14, 165, 233, 0.2), 0 0 0 16px rgba(14, 165, 233, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'all 0.5s ease'
              }}
            >
              <Navigation size={18} style={{ transform: `rotate(${(robotX * 3) % 360}deg)` }} />
            </div>

            {/* Ultrasonic scans visualization (pulse effect around robot) */}
            <div 
              style={{
                position: 'absolute',
                left: `${robotX}%`,
                top: `${robotY}%`,
                width: '140px',
                height: '140px',
                border: '1.5px solid rgba(14, 165, 233, 0.25)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'pulse 3s infinite',
                pointerEvents: 'none',
                transition: 'all 0.5s ease'
              }}
            ></div>
          </div>
        </div>

        {/* Right Side: Robot Details & Real-Time Assignment Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Robot Telemetry Stats */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Bot size={18} color="var(--primary)" />
              Robot Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Robot ID</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>{selectedRobot.robotId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Assigned Room</span>
                <span style={{ fontWeight: 700 }}>Room {selectedRobot.roomNumber || 'TBD'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Coordinates</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>X: {robotX.toFixed(1)}, Y: {robotY.toFixed(1)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Status</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: selectedRobot.status === 'Online' ? 'var(--success)' : selectedRobot.status === 'Scanning' ? 'var(--primary)' : 'var(--text-muted)'
                }}>{selectedRobot.status}</span>
              </div>
              
              {/* Battery Indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedRobot.battery === 100 ? <BatteryCharging size={16} color="var(--success)" /> : <Battery size={16} />}
                    Battery Charge
                  </span>
                  <span style={{ fontWeight: 700 }}>{selectedRobot.battery}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${selectedRobot.battery}%`, 
                    height: '100%', 
                    background: selectedRobot.battery > 50 ? 'var(--success)' : selectedRobot.battery > 20 ? 'var(--warning)' : 'var(--danger)',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Patient Info */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <User size={18} color="var(--warning)" />
              Target Monitored Patient
            </h3>

            {assignedPatient ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Patient Name (ID)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {assignedPatient.personalInfo?.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                    ID: {assignedPatient.patientId} &bull; Room: {assignedPatient.personalInfo?.roomNumber}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vitals Condition</span>
                  <span style={{ 
                    fontWeight: 700, 
                    color: assignedPatient.status?.emergency ? 'var(--danger)' : 'var(--success)'
                  }}>{assignedPatient.status?.condition || 'Stable'}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No active patient assigned to this robot unit.
              </div>
            )}
          </div>

          {/* Edit / Assignment Panel (Admin Settings Control Panel) */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                <Cpu size={18} color="var(--text-muted)" />
                Room & Care Assignments
              </h3>
              
              <button 
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600
                }}
              >
                {isEditing ? 'Cancel' : (
                  <>
                    <Edit3 size={14} />
                    <span>Reassign</span>
                  </>
                )}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target Room</label>
                  <input 
                    type="text" required placeholder="e.g. 302"
                    value={editForm.roomNumber}
                    onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Monitored Patient</label>
                  <select
                    value={editForm.patientId}
                    onChange={(e) => setEditForm({ ...editForm, patientId: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: 'white' }}
                  >
                    <option value="">-- No Patient --</option>
                    {allPatients.map(p => (
                      <option key={p.patientId} value={p.patientId}>
                        {p.personalInfo?.name} (Room {p.personalInfo?.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Operational Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: 'white' }}
                  >
                    <option value="Online">Online</option>
                    <option value="Scanning">Scanning</option>
                    <option value="Docked">Docked / Charging</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  style={{
                    background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '0.5rem'
                  }}
                >
                  <Check size={16} />
                  Save Reassignment
                </button>
              </form>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Active robots continuously report visual spatial obstacle sweeps. Click reassign to reallocate a unit to a different patient or hospital ward.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Mapping;
