import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';

const DatabaseContext = createContext();

// Resolve FastAPI backend URLs dynamically based on browser hostname (local / production dual environment compatible)
const getBackendUrls = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      api: 'http://127.0.0.1:8000',
      ws: 'ws://127.0.0.1:8000/ws/telemetry'
    };
  } else {
    return {
      api: import.meta.env.VITE_API_URL || 'https://karthikrobot.duckdns.org',
      ws: import.meta.env.VITE_WS_URL || 'wss://karthikrobot.duckdns.org/ws/telemetry'
    };
  }
};

const { api: API_BASE_URL, ws: WS_BASE_URL } = getBackendUrls();


export const DatabaseProvider = ({ children }) => {
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [robots, setRobots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'live', 'polling', 'disconnected'

  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Track logged-in user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  });

  const refreshUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      setCurrentUser(userStr ? JSON.parse(userStr) : null);
    } catch (e) {
      setCurrentUser(null);
    }
  };

  // Fetch initial static/directory data (Doctors & Nurses)
  const fetchDirectories = async () => {
    try {
      const [docRes, nurRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/doctors/`),
        fetch(`${API_BASE_URL}/api/nurses/`)
      ]);
      
      if (docRes.ok) {
        const docData = await docRes.json();
        setDoctors(docData);
      }
      if (nurRes.ok) {
        const nurData = await nurRes.json();
        setNurses(nurData);
      }
    } catch (err) {
      console.error('Error fetching directory listings:', err);
    }
  };

  // Full fetch fallback for active data
  const fetchActiveData = async () => {
    try {
      const [patRes, robRes, alertRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/patients/`),
        fetch(`${API_BASE_URL}/api/robots/`),
        fetch(`${API_BASE_URL}/api/alerts/`)
      ]);

      if (patRes.ok) setPatients(await patRes.json());
      if (robRes.ok) setRobots(await robRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
      
      setError(null);
    } catch (err) {
      console.error('Error fetching active data from API:', err);
    }
  };

  // REST polling fallback loop
  const startRestPolling = () => {
    if (pollingIntervalRef.current) return;
    setConnectionStatus('polling');
    console.log('Establishing REST fallback polling loop (3s)...');
    
    const poll = async () => {
      await fetchDirectories();
      await fetchActiveData();
    };

    poll();
    pollingIntervalRef.current = setInterval(poll, 3000);
  };

  const stopRestPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Connect to standard FastAPI WebSocket server
  const connectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    console.log(`Connecting to standard WebSocket at: ${WS_BASE_URL}`);
    setConnectionStatus('disconnected');

    try {
      const socket = new WebSocket(WS_BASE_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket stream connection established successfully!');
        setConnectionStatus('live');
        setError(null);
        stopRestPolling();
        fetchDirectories(); // Grab latest static doctor/nurse directories on load
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'INITIAL_STATE' || payload.type === 'TELEMETRY_UPDATE') {
            const { patients: updatedPatients, robots: updatedRobots, alerts: updatedAlerts } = payload.data;
            setPatients(updatedPatients || []);
            setRobots(updatedRobots || []);
            setAlerts(updatedAlerts || []);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket telemetry update:', err);
        }
      };

      socket.onerror = (err) => {
        console.warn('WebSocket encountered error, falling back to REST APIs:', err);
        startRestPolling();
      };

      socket.onclose = () => {
        console.log('WebSocket closed. Re-initiating polling...');
        startRestPolling();
        // Try to reconnect in 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket client:', err);
      startRestPolling();
    }
  };

  // 1. Initial connection triggers
  useEffect(() => {
    fetchDirectories().then(() => setLoading(false));
    connectWebSocket();

    return () => {
      stopRestPolling();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // 2. React to Auth changes in other tabs
  useEffect(() => {
    const authWatcher = setInterval(() => {
      try {
        const userStr = localStorage.getItem('user');
        const parsed = userStr ? JSON.parse(userStr) : null;
        if (JSON.stringify(parsed) !== JSON.stringify(currentUser)) {
          setCurrentUser(parsed);
        }
      } catch (e) {}
    }, 1000);

    return () => clearInterval(authWatcher);
  }, [currentUser]);

  // Expose API CRUD operations
  const addDoctor = async (doctorData) => {
    const docId = `D${Math.floor(100 + Math.random() * 900)}`;
    const payload = { doctorId: docId, ...doctorData };

    try {
      const res = await fetch(`${API_BASE_URL}/api/doctors/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Could not add doctor');
      const newDoc = await res.json();
      setDoctors(prev => [...prev, newDoc]);
      return newDoc;
    } catch (err) {
      console.error('Error adding doctor:', err);
      throw err;
    }
  };

  const removeDoctor = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/doctors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete doctor');
      setDoctors(prev => prev.filter(d => d.doctorId !== id));
      // Re-fetch patients to sync updated unassigned fields
      fetchActiveData();
    } catch (err) {
      console.error('Error removing doctor:', err);
      throw err;
    }
  };

  const addNurse = async (nurseData) => {
    const nurseId = `N${Math.floor(100 + Math.random() * 900)}`;
    const payload = { nurseId, ...nurseData };

    try {
      const res = await fetch(`${API_BASE_URL}/api/nurses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Could not add nurse');
      const newNurse = await res.json();
      setNurses(prev => [...prev, newNurse]);
      return newNurse;
    } catch (err) {
      console.error('Error adding nurse:', err);
      throw err;
    }
  };

  const removeNurse = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nurses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete nurse');
      setNurses(prev => prev.filter(n => n.nurseId !== id));
      fetchActiveData();
    } catch (err) {
      console.error('Error removing nurse:', err);
      throw err;
    }
  };

  const addPatient = async (patientData) => {
    const patientId = `P${Math.floor(100 + Math.random() * 900)}`;
    const payload = { patientId, ...patientData };

    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Could not add patient');
      const newPat = await res.json();
      setPatients(prev => [...prev, newPat]);
      return newPat;
    } catch (err) {
      console.error('Error adding patient:', err);
      throw err;
    }
  };

  const removePatient = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete patient');
      setPatients(prev => prev.filter(p => p.patientId !== id));
    } catch (err) {
      console.error('Error removing patient:', err);
      throw err;
    }
  };

  const updateRobot = async (robotId, updatedFields) => {
    // If the coordinates structure in frontend is flat (x, y), map to backend coordinates model
    let backendPayload = { ...updatedFields };
    if (updatedFields.x !== undefined && updatedFields.y !== undefined) {
      backendPayload.coordinates = { x: parseFloat(updatedFields.x), y: parseFloat(updatedFields.y) };
      delete backendPayload.x;
      delete backendPayload.y;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/robots/${robotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload)
      });
      if (res.ok) {
        const updatedRobot = await res.json();
        setRobots(prev => prev.map(r => r.robotId === robotId ? updatedRobot : r));
      }
    } catch (err) {
      console.error('Error updating robot:', err);
    }
  };

  const updatePatientAssignment = async (patientId, role, value) => {
    const existingPatient = patients.find(p => p.patientId === patientId);
    if (!existingPatient) return;

    const updatedAssignedStaff = {
      doctorId: existingPatient.assignedStaff?.doctorId || '',
      nurseId: existingPatient.assignedStaff?.nurseId || '',
      [role]: value || null
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedStaff: updatedAssignedStaff })
      });
      if (res.ok) {
        const updatedPat = await res.json();
        setPatients(prev => prev.map(p => p.patientId === patientId ? updatedPat : p));
      } else {
        throw new Error('Failed to update assignment');
      }
    } catch (err) {
      console.error('Error saving patient assignment:', err);
      alert('Could not update patient assignment. Please try again.');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        const updatedAlert = await res.json();
        setAlerts(prev => prev.map(a => a.alertId === alertId ? updatedAlert : a));
        // Force refresh all patient vital states to clear dashboard alert status instantly
        fetchActiveData();
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  // Perform dynamic filtering based on currently authenticated user role & ID
  const filteredPatients = useMemo(() => {
    if (!currentUser) return patients;
    if (currentUser.role === 'admin') return patients;
    if (currentUser.role === 'doctor') {
      return patients.filter(p => p.assignedStaff?.doctorId === currentUser.id);
    }
    if (currentUser.role === 'nurse') {
      return patients.filter(p => p.assignedStaff?.nurseId === currentUser.id);
    }
    return patients;
  }, [patients, currentUser]);

  return (
    <DatabaseContext.Provider value={{ 
      doctors, 
      nurses, 
      patients: filteredPatients, // serve filtered patient list application-wide
      allPatients: patients,      // backup full list
      robots,                     // Live list of active IRIS robots
      alerts,                     // Active/historical hospital emergency alerts
      connectionStatus,           // Connection telemetry status
      updateRobot,                // Helper to update coordinates/patient assignments
      currentUser,
      refreshUser,
      updatePatientAssignment,
      addDoctor, removeDoctor,
      addNurse, removeNurse,
      addPatient, removePatient,
      resolveAlert,
      loading,
      error
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
