import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

const DatabaseContext = createContext();

// Resolve API and WebSocket URLs dynamically (works both on local PC and AWS EC2 out-of-the-box!)
const getBackendUrls = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const prodIP = '13.201.121.241'; // Your AWS EC2 Public IP
  
  // If running locally, connect to localhost by default.
  // TIP: Change targetIP to prodIP to connect your local frontend to the live AWS EC2 backend!
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const targetIP = 'localhost'; // Toggle to prodIP (e.g. '13.201.121.241') to target AWS EC2 backend
    return {
      api: `http://${targetIP}:5000/api`,
      socket: `http://${targetIP}:5000`
    };
  } else {
    // When hosted on AWS, dynamically routes all requests to the EC2 Public or Private IP accessed by the user
    return {
      api: `http://${hostname}:5000/api`,
      socket: `http://${hostname}:5000`
    };
  }
};

const { api: API_URL, socket: SOCKET_URL } = getBackendUrls();

export const DatabaseProvider = ({ children }) => {
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  // Perform initial API data fetch to seed frontend state
  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, nurRes, patRes, robRes] = await Promise.all([
        fetch(`${API_URL}/doctors`),
        fetch(`${API_URL}/nurses`),
        fetch(`${API_URL}/patients`),
        fetch(`${API_URL}/robots`)
      ]);
      
      if (!docRes.ok || !nurRes.ok || !patRes.ok || !robRes.ok) {
        throw new Error('Failed to fetch data from backend');
      }

      const docData = await docRes.json();
      const nurData = await nurRes.json();
      const patData = await patRes.json();
      const robData = await robRes.json();

      setDoctors(docData);
      setNurses(nurData);
      setPatients(patData);
      setRobots(robData);
      setError(null);
    } catch (err) {
      console.error('Error fetching data from backend:', err);
      setError('Could not connect to the backend server. Make sure it is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial Data Load & WebSockets connection
  useEffect(() => {
    fetchData();

    // Establish WebSocket Connection
    console.log(`Connecting to WebSocket server at: ${SOCKET_URL}`);
    const socket = io(SOCKET_URL, {
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected successfully to backend.');
      setError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
    });

    // Realtime Patient Vitals and Status synchronization
    socket.on('patientUpdate', (updatedPatient) => {
      console.log('Realtime patient update received:', updatedPatient.patientId);
      
      if (updatedPatient._deleted) {
        setPatients(prev => prev.filter(p => p.patientId !== updatedPatient.patientId));
      } else {
        setPatients(prev => {
          const existsIndex = prev.findIndex(p => p.patientId === updatedPatient.patientId);
          if (existsIndex !== -1) {
            const updated = [...prev];
            updated[existsIndex] = updatedPatient;
            return updated;
          } else {
            return [...prev, updatedPatient];
          }
        });
      }
    });

    // Realtime Doctors updates
    socket.on('doctorsUpdate', (updatedDoctorsList) => {
      console.log('Realtime doctors list update received');
      setDoctors(updatedDoctorsList);
    });

    // Realtime Nurses updates
    socket.on('nursesUpdate', (updatedNursesList) => {
      console.log('Realtime nurses list update received');
      setNurses(updatedNursesList);
    });

    // Realtime Robots updates
    socket.on('robotsUpdate', (updatedRobotsList) => {
      console.log('Realtime robots list update received');
      setRobots(updatedRobotsList);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('patientUpdate');
      socket.off('doctorsUpdate');
      socket.off('nursesUpdate');
      socket.off('robotsUpdate');
      socket.disconnect();
      console.log('Socket.IO connection closed.');
    };
  }, []);

  // 2. Local storage watchdog to keep login/logout state reactive across tabs/reloads
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

  const updatePatientAssignment = async (patientId, role, value) => {
    // Optimistic UI update
    const previousPatients = [...patients];
    setPatients(prev => prev.map(p => {
      if (p.patientId === patientId) {
        return {
          ...p,
          assignedStaff: {
            ...p.assignedStaff,
            [role]: value
          }
        };
      }
      return p;
    }));

    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, value })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating patient assignment:', error);
      setPatients(previousPatients); // Revert on failure
      alert('Failed to save changes to the database. Please try again.');
    }
  };

  const addDoctor = async (doctor) => {
    try {
      const res = await fetch(`${API_URL}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctor)
      });
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
      await fetch(`${API_URL}/doctors/${id}`, { method: 'DELETE' });
      setDoctors(prev => prev.filter(d => d.doctorId !== id));
      setPatients(prev => prev.map(p => {
        if (p.assignedStaff?.doctorId === id) {
          return { ...p, assignedStaff: { ...p.assignedStaff, doctorId: '' } };
        }
        return p;
      }));
    } catch (err) {
      console.error('Error removing doctor:', err);
      throw err;
    }
  };

  const addNurse = async (nurse) => {
    try {
      const res = await fetch(`${API_URL}/nurses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nurse)
      });
      const newNur = await res.json();
      setNurses(prev => [...prev, newNur]);
      return newNur;
    } catch (err) {
      console.error('Error adding nurse:', err);
      throw err;
    }
  };

  const removeNurse = async (id) => {
    try {
      await fetch(`${API_URL}/nurses/${id}`, { method: 'DELETE' });
      setNurses(prev => prev.filter(n => n.nurseId !== id));
      setPatients(prev => prev.map(p => {
        if (p.assignedStaff?.nurseId === id) {
          return { ...p, assignedStaff: { ...p.assignedStaff, nurseId: '' } };
        }
        return p;
      }));
    } catch (err) {
      console.error('Error removing nurse:', err);
      throw err;
    }
  };

  const addPatient = async (patient) => {
    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
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
      await fetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
      setPatients(prev => prev.filter(p => p.patientId !== id));
    } catch (err) {
      console.error('Error removing patient:', err);
      throw err;
    }
  };

  const updateRobot = async (robotId, updatedFields) => {
    setRobots(prev => prev.map(r => r.robotId === robotId ? { ...r, ...updatedFields } : r));

    try {
      const response = await fetch(`${API_URL}/robots/${robotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!response.ok) {
        throw new Error('Failed to update robot');
      }
    } catch (err) {
      console.error('Error updating robot:', err);
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
      updateRobot,                // Helper to update coordinates/patient assignments
      currentUser,
      refreshUser,
      updatePatientAssignment,
      addDoctor, removeDoctor,
      addNurse, removeNurse,
      addPatient, removePatient,
      loading,
      error
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
