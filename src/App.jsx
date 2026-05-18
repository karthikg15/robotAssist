import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws/telemetry'

function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('patients') // 'patients', 'robots', 'staff', 'alerts'
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // 'live', 'polling', 'disconnected'

  // Data States
  const [patients, setPatients] = useState([])
  const [robots, setRobots] = useState([])
  const [alerts, setAlerts] = useState([])
  const [doctors, setDoctors] = useState([])
  const [nurses, setNurses] = useState([])

  // Modal forms open/close states
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)
  const [isRobotModalOpen, setIsRobotModalOpen] = useState(false)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)

  // Form Fields State
  const [patientForm, setPatientForm] = useState({
    patientId: '',
    name: '',
    age: '',
    gender: 'Male',
    roomNumber: '',
    heartRate: 80,
    temperature: 36.8,
    systolic: 120,
    diastolic: 80,
    spo2: 98,
    oxygenSaturation: 97,
    respirationRate: 16,
    irSensor: 40,
    ultrasonicSensor: 100,
    emotionCurrent: 'Calm',
    emotionConfidence: 90,
    condition: 'Stable',
    doctorId: '',
    nurseId: ''
  })

  const [robotForm, setRobotForm] = useState({
    robotId: '',
    name: '',
    roomNumber: '',
    patientId: '',
    status: 'Online',
    battery: 100,
    x: 50.0,
    y: 50.0
  })

  const [staffForm, setStaffForm] = useState({
    staffType: 'doctor', // 'doctor' or 'nurse'
    id: '',
    name: '',
    age: '',
    gender: 'Male',
    specialty: '', // for doctors
    experienceYears: '', // for doctors
    availability: 'On Duty'
  })

  const socketRef = useRef(null)
  const pollingIntervalRef = useRef(null)

  // Fetch initial REST data (Doctors & Nurses, also fallback if socket fails)
  const fetchDoctorsAndNurses = async () => {
    try {
      const docRes = await fetch(`${API_BASE_URL}/api/doctors/`)
      if (docRes.ok) {
        const docData = await docRes.json()
        setDoctors(docData)
      }
      const nurseRes = await fetch(`${API_BASE_URL}/api/nurses/`)
      if (nurseRes.ok) {
        const nurseData = await nurseRes.json()
        setNurses(nurseData)
      }
    } catch (e) {
      console.error('Error fetching staff directory', e)
    }
  }

  // REST polling fallback
  const startRestPolling = () => {
    if (pollingIntervalRef.current) return
    setConnectionStatus('polling')
    console.log('Starting REST API fallback polling loop...')
    
    const poll = async () => {
      try {
        const [patRes, robRes, alertRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/patients/`),
          fetch(`${API_BASE_URL}/api/robots/`),
          fetch(`${API_BASE_URL}/api/alerts/`)
        ])
        
        if (patRes.ok) setPatients(await patRes.json())
        if (robRes.ok) setRobots(await robRes.json())
        if (alertRes.ok) setAlerts(await alertRes.json())
        
        setConnectionStatus('polling')
      } catch (err) {
        console.error('REST Polling failed', err)
        setConnectionStatus('disconnected')
      }
    };

    poll() // run once immediately
    pollingIntervalRef.current = setInterval(poll, 3000)
  }

  const stopRestPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Connect to WebSocket Telemetry Stream
  const connectWebSocket = () => {
    console.log('Connecting to WebSocket Telemetry stream...')
    
    try {
      const socket = new WebSocket(WS_BASE_URL)
      socketRef.current = socket

      socket.onopen = () => {
        console.log('WebSocket successfully connected!')
        setConnectionStatus('live')
        stopRestPolling() // disable REST fallback
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'INITIAL_STATE' || payload.type === 'TELEMETRY_UPDATE') {
            const { patients, robots, alerts } = payload.data
            setPatients(patients || [])
            setRobots(robots || [])
            setAlerts(alerts || [])
          }
        } catch (err) {
          console.error('Error parsing socket event message', err)
        }
      }

      socket.onerror = (error) => {
        console.warn('WebSocket encountered error, falling back to REST APIs.', error)
        startRestPolling()
      }

      socket.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 5 seconds...')
        setConnectionStatus('disconnected')
        startRestPolling() // Immediately fallback to polling
        setTimeout(connectWebSocket, 5000) // Reconnect try
      }

    } catch (e) {
      console.error('WebSocket connection initialization failed', e)
      startRestPolling()
    }
  }

  // Lifecycle Setup
  useEffect(() => {
    fetchDoctorsAndNurses()
    connectWebSocket()

    return () => {
      if (socketRef.current) socketRef.current.close()
      stopRestPolling()
    }
  }, [])

  // Sync staff list whenever patients changes (in case assignedStaff triggers list reload)
  useEffect(() => {
    fetchDoctorsAndNurses()
  }, [patients])

  // REST Submissions & Deletions
  const handleResolveAlert = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      if (res.ok) {
        // Refresh alert list
        const updated = alerts.map(a => a.alertId === alertId ? { ...a, resolved: true } : a)
        setAlerts(updated)
      }
    } catch (err) {
      alert('Failed to resolve alert: ' + err.message)
    }
  }

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm(`Are you sure you want to remove patient ${patientId}?`)) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setPatients(patients.filter(p => p.patientId !== patientId))
      } else {
        const error = await res.json()
        alert('Error: ' + error.detail)
      }
    } catch (err) {
      alert('Delete request failed: ' + err.message)
    }
  }

  const handleDeleteRobot = async (robotId) => {
    if (!window.confirm(`Are you sure you want to decommission robot ${robotId}?`)) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/robots/${robotId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setRobots(robots.filter(r => r.robotId !== robotId))
      } else {
        const error = await res.json()
        alert('Error: ' + error.detail)
      }
    } catch (err) {
      alert('Decommission request failed: ' + err.message)
    }
  }

  const handleDeleteStaff = async (type, id) => {
    const term = type === 'doctor' ? 'doctor' : 'nurse'
    if (!window.confirm(`Are you sure you want to remove ${term} ${id}?`)) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/${term}s/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        if (type === 'doctor') {
          setDoctors(doctors.filter(d => d.doctorId !== id))
        } else {
          setNurses(nurses.filter(n => n.nurseId !== id))
        }
      } else {
        const error = await res.json()
        alert('Error: ' + error.detail)
      }
    } catch (err) {
      alert('Removal request failed: ' + err.message)
    }
  }

  const handlePatientSubmit = async (e) => {
    e.preventDefault()
    
    // Structure payload based on PatientCreate model
    const payload = {
      patientId: patientForm.patientId,
      personalInfo: {
        name: patientForm.name,
        age: parseInt(patientForm.age),
        gender: patientForm.gender,
        roomNumber: patientForm.roomNumber
      },
      vitals: {
        heartRate: parseInt(patientForm.heartRate),
        temperature: parseFloat(patientForm.temperature),
        bloodPressure: {
          systolic: parseInt(patientForm.systolic),
          diastolic: parseInt(patientForm.diastolic)
        },
        spo2: parseInt(patientForm.spo2),
        oxygenSaturation: parseInt(patientForm.oxygenSaturation),
        respirationRate: parseInt(patientForm.respirationRate)
      },
      sensors: {
        irSensor: parseInt(patientForm.irSensor),
        ultrasonicSensor: parseInt(patientForm.ultrasonicSensor)
      },
      emotion: {
        current: patientForm.emotionCurrent,
        confidence: parseInt(patientForm.emotionConfidence)
      },
      status: {
        condition: patientForm.condition,
        emergency: patientForm.condition === 'Critical',
        fallDetected: false
      },
      assignedStaff: {
        doctorId: patientForm.doctorId || null,
        nurseId: patientForm.nurseId || null
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const newPatient = await res.json()
        setPatients([...patients, newPatient])
        setIsPatientModalOpen(false)
        // Reset form
        setPatientForm({
          patientId: '', name: '', age: '', gender: 'Male', roomNumber: '',
          heartRate: 80, temperature: 36.8, systolic: 120, diastolic: 80,
          spo2: 98, oxygenSaturation: 97, respirationRate: 16, irSensor: 40,
          ultrasonicSensor: 100, emotionCurrent: 'Calm', emotionConfidence: 90,
          condition: 'Stable', doctorId: '', nurseId: ''
        })
      } else {
        const error = await res.json()
        alert('Registration Failed: ' + (error.detail || JSON.stringify(error)))
      }
    } catch (err) {
      alert('Request error: ' + err.message)
    }
  }

  const handleRobotSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      robotId: robotForm.robotId,
      name: robotForm.name,
      roomNumber: robotForm.roomNumber,
      patientId: robotForm.patientId || null,
      status: robotForm.status,
      battery: parseInt(robotForm.battery),
      coordinates: {
        x: parseFloat(robotForm.x),
        y: parseFloat(robotForm.y)
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/robots/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const newRobot = await res.json()
        setRobots([...robots, newRobot])
        setIsRobotModalOpen(false)
        setRobotForm({
          robotId: '', name: '', roomNumber: '', patientId: '',
          status: 'Online', battery: 100, x: 50.0, y: 50.0
        })
      } else {
        const error = await res.json()
        alert('Adding Robot Failed: ' + (error.detail || JSON.stringify(error)))
      }
    } catch (err) {
      alert('Request error: ' + err.message)
    }
  }

  const handleStaffSubmit = async (e) => {
    e.preventDefault()
    const isDoc = staffForm.staffType === 'doctor'
    const endpoint = isDoc ? 'doctors' : 'nurses'

    let payload = {}
    if (isDoc) {
      payload = {
        doctorId: staffForm.id,
        personalInfo: {
          name: staffForm.name,
          age: parseInt(staffForm.age),
          gender: staffForm.gender
        },
        professionalInfo: {
          field: staffForm.specialty || 'General Medicine',
          experienceYears: parseInt(staffForm.experienceYears) || 0
        },
        status: {
          availability: staffForm.availability
        },
        assignedPatients: []
      }
    } else {
      payload = {
        nurseId: staffForm.id,
        personalInfo: {
          name: staffForm.name,
          age: parseInt(staffForm.age),
          gender: staffForm.gender
        },
        status: {
          availability: staffForm.availability
        },
        assignedPatients: []
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const newStaff = await res.json()
        if (isDoc) {
          setDoctors([...doctors, newStaff])
        } else {
          setNurses([...nurses, newStaff])
        }
        setIsStaffModalOpen(false)
        setStaffForm({
          staffType: 'doctor', id: '', name: '', age: '', gender: 'Male',
          specialty: '', experienceYears: '', availability: 'On Duty'
        })
      } else {
        const error = await res.json()
        alert('Adding Staff Failed: ' + (error.detail || JSON.stringify(error)))
      }
    } catch (err) {
      alert('Request error: ' + err.message)
    }
  }

  // Active Alerts Count
  const activeAlerts = alerts.filter(a => !a.resolved)

  return (
    <>
      {/* 🚀 Dashboard Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-logo-glow">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--accent-cyan)" strokeWidth="2.5" fill="none">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="brand-title">
            <h1>IRIS MED-FLEET</h1>
            <p>Patient vital monitoring & robot fleet management</p>
          </div>
        </div>

        <div className="connection-status">
          <span className={`status-dot ${connectionStatus === 'live' ? 'active' : connectionStatus === 'polling' ? 'polling' : 'disconnected'}`}></span>
          <span>
            {connectionStatus === 'live' && 'LIVE STREAM ACTIVE'}
            {connectionStatus === 'polling' && 'REST API POLLING'}
            {connectionStatus === 'disconnected' && 'OFFLINE - RECONNECTING'}
          </span>
        </div>
      </header>

      {/* 📊 Metrics Summary Row */}
      <section className="metrics-row">
        {/* Metric 1 */}
        <div className="metric-card glass-panel">
          <div className="metric-icon-wrapper cyan">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <div className="metric-info">
            <h3>Monitored Patients</h3>
            <p>{patients.length}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className={`metric-card glass-panel ${activeAlerts.length > 0 ? 'emergency-active' : ''}`}>
          <div className="metric-icon-wrapper rose">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          </div>
          <div className="metric-info">
            <h3>Active Emergencies</h3>
            <p>{activeAlerts.length}</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="metric-card glass-panel">
          <div className="metric-icon-wrapper emerald">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M12 2v9M8 5h8" />
            </svg>
          </div>
          <div className="metric-info">
            <h3>Active Robots</h3>
            <p>{robots.length}</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="metric-card glass-panel">
          <div className="metric-icon-wrapper amber">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="metric-info">
            <h3>Staff Available</h3>
            <p>{doctors.filter(d => d.status.availability === 'On Duty').length + nurses.filter(n => n.status.availability === 'On Duty').length}</p>
          </div>
        </div>
      </section>

      {/* 🧭 Tabs Navigation bar */}
      <nav className="tabs-navigation">
        <button className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
          📋 Patients Directory
        </button>
        <button className={`tab-btn ${activeTab === 'robots' ? 'active' : ''}`} onClick={() => setActiveTab('robots')}>
          🤖 Fleet Telemetry
        </button>
        <button className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
          🩺 Medical Staff
        </button>
        <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          ⚠️ Alert Logs {activeAlerts.length > 0 && <span className="tab-badge">{activeAlerts.length}</span>}
        </button>
      </nav>

      {/* 🖥️ Active Tab Content rendering */}
      <main style={{ flexGrow: 1, paddingBottom: '40px' }}>

        {/* 1. PATIENTS TAB */}
        {activeTab === 'patients' && (
          <div>
            <div className="tab-actions-panel">
              <div className="tab-title">PATIENTS DIRECTORY</div>
              <button className="action-btn" onClick={() => setIsPatientModalOpen(true)}>
                <span>+ REGISTER PATIENT</span>
              </button>
            </div>

            {patients.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                No active patients being monitored. Click '+ Register Patient' above to add one.
              </div>
            ) : (
              <div className="patients-grid">
                {patients.map(patient => {
                  const hasAlert = alerts.some(a => a.patientId === patient.patientId && !a.resolved)
                  const isEmerg = patient.status.emergency || hasAlert

                  return (
                    <div key={patient.patientId} className={`patient-card glass-panel ${isEmerg ? 'emergency' : ''}`}>
                      <div className="patient-card-header">
                        <div className="patient-meta">
                          <h3>{patient.personalInfo.name}</h3>
                          <p>{patient.personalInfo.gender}, {patient.personalInfo.age} yrs • Room {patient.personalInfo.roomNumber}</p>
                        </div>
                        <span className={`patient-badge ${isEmerg ? 'critical' : 'stable'}`}>
                          {isEmerg ? 'CRITICAL' : 'STABLE'}
                        </span>
                      </div>

                      {/* Vitals snapshot */}
                      <div className="patient-vitals-grid">
                        <div className="vital-box">
                          <span className="vital-label">
                            <span style={{ marginRight: '6px' }} className="heart-icon-pulsing">❤️</span>
                            Heart Rate
                          </span>
                          <div className="vital-value-row">
                            <span className="vital-number">{patient.vitals.heartRate}</span>
                            <span className="vital-unit">bpm</span>
                          </div>
                        </div>

                        <div className="vital-box">
                          <span className="vital-label">🌡️ Temperature</span>
                          <div className="vital-value-row">
                            <span className="vital-number">{patient.vitals.temperature}</span>
                            <span className="vital-unit">°C</span>
                          </div>
                        </div>

                        <div className="vital-box">
                          <span className="vital-label">🩸 SpO2</span>
                          <div className="vital-value-row">
                            <span className="vital-number">{patient.vitals.spo2}</span>
                            <span className="vital-unit">%</span>
                          </div>
                        </div>

                        <div className="vital-box">
                          <span className="vital-label">🫁 Respiration</span>
                          <div className="vital-value-row">
                            <span className="vital-number">{patient.vitals.respirationRate}</span>
                            <span className="vital-unit">rpm</span>
                          </div>
                        </div>
                      </div>

                      <div className="patient-assigned-staff">
                        <span>🩺 Doc: {patient.assignedStaff.doctorId || 'Unassigned'}</span>
                        <span>👩‍⚕️ Nurse: {patient.assignedStaff.nurseId || 'Unassigned'}</span>
                      </div>

                      <div className="patient-sub-details">
                        <span>⚡ Ultrasonic: {patient.sensors.ultrasonicSensor}cm</span>
                        <span>🎭 Emotion: {patient.emotion.current} ({patient.emotion.confidence}%)</span>
                      </div>

                      <div className="card-details-divider"></div>

                      <div className="patient-card-footer">
                        {hasAlert && (
                          <button 
                            className="resolve-btn"
                            onClick={() => {
                              const activeA = alerts.find(a => a.patientId === patient.patientId && !a.resolved)
                              if (activeA) handleResolveAlert(activeA.alertId)
                            }}
                          >
                            ✓ RESOLVE ALERT
                          </button>
                        )}
                        <button className="delete-btn" onClick={() => handleDeletePatient(patient.patientId)}>
                          🗑️ REMOVE
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. FLEET TELEMETRY TAB */}
        {activeTab === 'robots' && (
          <div>
            <div className="tab-actions-panel">
              <div className="tab-title">IRIS FLEET MANAGEMENT</div>
              <button className="action-btn" onClick={() => setIsRobotModalOpen(true)}>
                <span>+ ADD ROBOT</span>
              </button>
            </div>

            {robots.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                No active robots registered in the fleet. Click '+ Add Robot' above to enlist one.
              </div>
            ) : (
              <div className="robots-grid">
                {robots.map(robot => {
                  const bat = robot.battery
                  const batClass = bat > 50 ? 'good' : bat > 15 ? 'warning' : 'low'
                  return (
                    <div key={robot.robotId} className="robot-card glass-panel">
                      <div className="robot-card-header">
                        <div className="robot-name">
                          <h3>{robot.name}</h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {robot.robotId}</span>
                        </div>
                        <span className={`patient-badge ${robot.status === 'Online' || robot.status === 'Scanning' ? 'stable' : robot.status === 'Docked' ? 'warning' : 'critical'}`}>
                          {robot.status}
                        </span>
                      </div>

                      <div className="robot-battery-row">
                        <span>🔋 {bat}%</span>
                        <div className="battery-bar-container">
                          <div className={`battery-fill ${batClass}`} style={{ width: `${bat}%` }}></div>
                        </div>
                      </div>

                      <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                        <div>📍 Room Location: <strong>{robot.roomNumber}</strong></div>
                        <div>👤 Target Patient: <strong>{robot.patientId || 'Unassigned / Patrol'}</strong></div>
                      </div>

                      <div className="robot-coords-view">
                        Coordinates: <span style={{ fontFamily: 'monospace' }}>X: {robot.coordinates.x}, Y: {robot.coordinates.y}</span>
                      </div>

                      <div className="card-details-divider"></div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="delete-btn" onClick={() => handleDeleteRobot(robot.robotId)}>
                          🗑️ DECOMMISSION
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. STAFF DIRECTORY TAB */}
        {activeTab === 'staff' && (
          <div>
            <div className="tab-actions-panel">
              <div className="tab-title">STAFF DIRECTORY</div>
              <button className="action-btn" onClick={() => setIsStaffModalOpen(true)}>
                <span>+ ADD STAFF</span>
              </button>
            </div>

            <div className="staff-sections">
              {/* Doctors Section */}
              <div className="glass-panel">
                <h3 className="staff-section-title">🩺 DOCTORS</h3>
                {doctors.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No doctors registered.</p>
                ) : (
                  <div className="staff-list">
                    {doctors.map(doc => (
                      <div key={doc.doctorId} className="staff-card">
                        <div className="staff-info">
                          <h4>{doc.personalInfo.name}</h4>
                          <p>{doc.professionalInfo.field} • {doc.professionalInfo.experienceYears} yrs exp • ID: {doc.doctorId}</p>
                          <p style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                            Patients: {doc.assignedPatients?.join(', ') || 'None'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`staff-status-badge ${doc.status.availability === 'On Duty' ? 'on-duty' : doc.status.availability === 'On Call' ? 'on-call' : 'off-duty'}`}>
                            {doc.status.availability}
                          </span>
                          <button className="staff-delete-btn" onClick={() => handleDeleteStaff('doctor', doc.doctorId)}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nurses Section */}
              <div className="glass-panel">
                <h3 className="staff-section-title">👩‍⚕️ NURSES</h3>
                {nurses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No nurses registered.</p>
                ) : (
                  <div className="staff-list">
                    {nurses.map(nurse => (
                      <div key={nurse.nurseId} className="staff-card">
                        <div className="staff-info">
                          <h4>{nurse.personalInfo.name}</h4>
                          <p>{nurse.personalInfo.gender}, {nurse.personalInfo.age} yrs • ID: {nurse.nurseId}</p>
                          <p style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                            Patients: {nurse.assignedPatients?.join(', ') || 'None'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`staff-status-badge ${nurse.status.availability === 'On Duty' ? 'on-duty' : nurse.status.availability === 'On Call' ? 'on-call' : 'off-duty'}`}>
                            {nurse.status.availability}
                          </span>
                          <button className="staff-delete-btn" onClick={() => handleDeleteStaff('nurse', nurse.nurseId)}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. ALERT LOGS TAB */}
        {activeTab === 'alerts' && (
          <div>
            <div className="tab-actions-panel">
              <div className="tab-title">EMERGENCY & ALERT LOGS</div>
            </div>

            {alerts.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                No active or historical alerts recorded in database logs.
              </div>
            ) : (
              <div className="alerts-list-container">
                {alerts.slice().reverse().map(alert => (
                  <div key={alert.alertId} className={`alert-log-card glass-panel ${alert.resolved ? 'resolved' : ''}`}>
                    <div className="alert-log-meta">
                      <h4 style={{ color: alert.resolved ? 'var(--status-stable)' : 'var(--status-critical)' }}>
                        {alert.resolved ? '✓ Resolved' : '⚠️ ACTIVE'}: {alert.type}
                      </h4>
                      <p>
                        Patient: <strong>{alert.patientName}</strong> ({alert.patientId}) • Severity:{' '}
                        <strong style={{ color: alert.severity === 'Critical' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                          {alert.severity}
                        </strong>
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Timestamp: {new Date(alert.timestamp).toLocaleString()}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="alert-vitals-snapshot">
                        <span>HR: {alert.vitals.heartRate || '--'}</span>
                        <span>Temp: {alert.vitals.temperature || '--'}°C</span>
                        <span>SpO2: {alert.vitals.spo2 || '--'}%</span>
                      </div>
                      {!alert.resolved && (
                        <button className="resolve-btn" onClick={() => handleResolveAlert(alert.alertId)}>
                          RESOLVE ALERT
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* 📝 1. REGISTER PATIENT MODAL FORM */}
      {isPatientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Register New Monitored Patient</h2>
              <button className="modal-close-btn" onClick={() => setIsPatientModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handlePatientSubmit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Patient ID (e.g. P104)</label>
                  <input 
                    type="text" required placeholder="P104"
                    value={patientForm.patientId} 
                    onChange={e => setPatientForm({ ...patientForm, patientId: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" required placeholder="Jane Smith"
                    value={patientForm.name} 
                    onChange={e => setPatientForm({ ...patientForm, name: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Age</label>
                  <input 
                    type="number" required placeholder="45"
                    value={patientForm.age} 
                    onChange={e => setPatientForm({ ...patientForm, age: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select 
                    value={patientForm.gender} 
                    onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Room Number</label>
                  <input 
                    type="text" required placeholder="ICU-02"
                    value={patientForm.roomNumber} 
                    onChange={e => setPatientForm({ ...patientForm, roomNumber: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Condition Status</label>
                  <select 
                    value={patientForm.condition} 
                    onChange={e => setPatientForm({ ...patientForm, condition: e.target.value })}
                  >
                    <option value="Stable">Stable</option>
                    <option value="Under Observation">Under Observation</option>
                    <option value="Critical">Critical (Triggers Alert)</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Assigned Doctor</label>
                  <select 
                    value={patientForm.doctorId} 
                    onChange={e => setPatientForm({ ...patientForm, doctorId: e.target.value })}
                  >
                    <option value="">None / Unassigned</option>
                    {doctors.map(d => (
                      <option key={d.doctorId} value={d.doctorId}>{d.personalInfo.name} ({d.professionalInfo.field})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assigned Nurse</label>
                  <select 
                    value={patientForm.nurseId} 
                    onChange={e => setPatientForm({ ...patientForm, nurseId: e.target.value })}
                  >
                    <option value="">None / Unassigned</option>
                    {nurses.map(n => (
                      <option key={n.nurseId} value={n.nurseId}>{n.personalInfo.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--accent-cyan)' }}>
                <strong>Vitals Initialization</strong>
              </div>
              <div className="form-grid-2" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label>Pulse Rate (BPM)</label>
                  <input 
                    type="number" value={patientForm.heartRate} 
                    onChange={e => setPatientForm({ ...patientForm, heartRate: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input 
                    type="number" step="0.1" value={patientForm.temperature} 
                    onChange={e => setPatientForm({ ...patientForm, temperature: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Oxygen SpO2 (%)</label>
                  <input 
                    type="number" value={patientForm.spo2} 
                    onChange={e => setPatientForm({ ...patientForm, spo2: e.target.value, oxygenSaturation: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Respiration (rpm)</label>
                  <input 
                    type="number" value={patientForm.respirationRate} 
                    onChange={e => setPatientForm({ ...patientForm, respirationRate: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="form-btn-secondary" onClick={() => setIsPatientModalOpen(false)}>Cancel</button>
                <button type="submit" className="form-btn-submit">Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📝 2. REGISTER ROBOT MODAL FORM */}
      {isRobotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Register New IRIS Fleet Robot</h2>
              <button className="modal-close-btn" onClick={() => setIsRobotModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRobotSubmit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Robot ID (e.g. R004)</label>
                  <input 
                    type="text" required placeholder="R004"
                    value={robotForm.robotId} 
                    onChange={e => setRobotForm({ ...robotForm, robotId: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Robot Model/Name</label>
                  <input 
                    type="text" required placeholder="IRIS-04 Delta"
                    value={robotForm.name} 
                    onChange={e => setRobotForm({ ...robotForm, name: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Room Number</label>
                  <input 
                    type="text" required placeholder="302"
                    value={robotForm.roomNumber} 
                    onChange={e => setRobotForm({ ...robotForm, roomNumber: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Target Assigned Patient ID</label>
                  <select 
                    value={robotForm.patientId} 
                    onChange={e => setRobotForm({ ...robotForm, patientId: e.target.value })}
                  >
                    <option value="">None / Routine Patrol</option>
                    {patients.map(p => (
                      <option key={p.patientId} value={p.patientId}>{p.personalInfo.name} ({p.patientId})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Initial Status</label>
                  <select 
                    value={robotForm.status} 
                    onChange={e => setRobotForm({ ...robotForm, status: e.target.value })}
                  >
                    <option value="Online">Online</option>
                    <option value="Scanning">Scanning</option>
                    <option value="Docked">Docked</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Battery Charge (%)</label>
                  <input 
                    type="number" max="100" min="0" value={robotForm.battery} 
                    onChange={e => setRobotForm({ ...robotForm, battery: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Floor X Coordinate (0-100)</label>
                  <input 
                    type="number" step="0.1" value={robotForm.x} 
                    onChange={e => setRobotForm({ ...robotForm, x: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Floor Y Coordinate (0-100)</label>
                  <input 
                    type="number" step="0.1" value={robotForm.y} 
                    onChange={e => setRobotForm({ ...robotForm, y: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="form-btn-secondary" onClick={() => setIsRobotModalOpen(false)}>Cancel</button>
                <button type="submit" className="form-btn-submit">Add Robot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📝 3. REGISTER STAFF MODAL FORM */}
      {isStaffModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Register New Staff Member</h2>
              <button className="modal-close-btn" onClick={() => setIsStaffModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleStaffSubmit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Staff Role Type</label>
                  <select 
                    value={staffForm.staffType} 
                    onChange={e => setStaffForm({ ...staffForm, staffType: e.target.value })}
                  >
                    <option value="doctor">Medical Doctor</option>
                    <option value="nurse">Registered Nurse</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Staff ID (e.g. D204, N304)</label>
                  <input 
                    type="text" required placeholder={staffForm.staffType === 'doctor' ? 'D204' : 'N304'}
                    value={staffForm.id} 
                    onChange={e => setStaffForm({ ...staffForm, id: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Staff Full Name</label>
                  <input 
                    type="text" required placeholder="Dr. Sarah Carter"
                    value={staffForm.name} 
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select 
                    value={staffForm.gender} 
                    onChange={e => setStaffForm({ ...staffForm, gender: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Age</label>
                  <input 
                    type="number" required placeholder="36"
                    value={staffForm.age} 
                    onChange={e => setStaffForm({ ...staffForm, age: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Availability Status</label>
                  <select 
                    value={staffForm.availability} 
                    onChange={e => setStaffForm({ ...staffForm, availability: e.target.value })}
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="On Call">On Call</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>

              {staffForm.staffType === 'doctor' && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Medical Field (Specialty)</label>
                    <input 
                      type="text" required placeholder="Neurology"
                      value={staffForm.specialty} 
                      onChange={e => setStaffForm({ ...staffForm, specialty: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Years of Experience</label>
                    <input 
                      type="number" required placeholder="8"
                      value={staffForm.experienceYears} 
                      onChange={e => setStaffForm({ ...staffForm, experienceYears: e.target.value })} 
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="form-btn-secondary" onClick={() => setIsStaffModalOpen(false)}>Cancel</button>
                <button type="submit" className="form-btn-submit">Add Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default App
