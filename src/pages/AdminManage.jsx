import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Trash2, Plus, Search, User, Shield, Briefcase, Key, MapPin, HeartPulse, ShieldAlert, Phone, HelpCircle } from 'lucide-react';
import './AdminManage.css';

const AdminManage = () => {
  const { 
    patients, doctors, nurses, 
    addPatient, removePatient, 
    addDoctor, removeDoctor, 
    addNurse, removeNurse 
  } = useDatabase();

  const [activeTab, setActiveTab] = useState('patients');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [patientForm, setPatientForm] = useState({
    name: '', age: '', gender: 'Male', roomNumber: '',
    heartRate: '75', temperature: '36.8', spo2: '98', rr: '16',
    bpSys: '120', bpDia: '80', doctorId: '', nurseId: ''
  });

  const [doctorForm, setDoctorForm] = useState({
    name: '', age: '', gender: 'Male', field: 'Cardiology',
    experienceYears: '5', availability: 'On Duty', contact: 'Ext ',
    username: '', password: ''
  });

  const [nurseForm, setNurseForm] = useState({
    name: '', age: '', gender: 'Male', shift: 'Morning',
    availability: 'On Duty', contact: 'Ext ',
    username: '', password: ''
  });

  const resetForms = () => {
    setPatientForm({
      name: '', age: '', gender: 'Male', roomNumber: '',
      heartRate: '75', temperature: '36.8', spo2: '98', rr: '16',
      bpSys: '120', bpDia: '80', doctorId: '', nurseId: ''
    });
    setDoctorForm({
      name: '', age: '', gender: 'Male', field: 'Cardiology',
      experienceYears: '5', availability: 'On Duty', contact: 'Ext ',
      username: '', password: ''
    });
    setNurseForm({
      name: '', age: '', gender: 'Male', shift: 'Morning',
      availability: 'On Duty', contact: 'Ext ',
      username: '', password: ''
    });
  };

  const handleOpenModal = () => {
    resetForms();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Submit Handlers
  const handleAddPatient = async (e) => {
    e.preventDefault();
    const newPat = {
      personalInfo: {
        name: patientForm.name,
        age: parseInt(patientForm.age) || 30,
        gender: patientForm.gender,
        roomNumber: patientForm.roomNumber || 'TBD'
      },
      vitals: {
        heartRate: parseInt(patientForm.heartRate) || 75,
        temperature: parseFloat(patientForm.temperature) || 36.8,
        bloodPressure: {
          systolic: parseInt(patientForm.bpSys) || 120,
          diastolic: parseInt(patientForm.bpDia) || 80
        },
        spo2: parseInt(patientForm.spo2) || 98,
        oxygenSaturation: parseInt(patientForm.spo2) || 98,
        respiratoryRate: parseInt(patientForm.rr) || 16
      },
      sensors: {
        irSensor: 40,
        ultrasonicSensor: 100
      },
      emotion: {
        current: 'Neutral',
        confidence: 90
      },
      status: {
        condition: 'Stable',
        emergency: false,
        fallDetected: false
      },
      assignedStaff: {
        doctorId: patientForm.doctorId,
        nurseId: patientForm.nurseId
      }
    };

    try {
      await addPatient(newPat);
      setShowModal(false);
    } catch (err) {
      alert('Failed to add patient to database.');
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    const newDoc = {
      personalInfo: {
        name: doctorForm.name,
        age: parseInt(doctorForm.age) || 40,
        gender: doctorForm.gender
      },
      professionalInfo: {
        field: doctorForm.field,
        experienceYears: parseInt(doctorForm.experienceYears) || 5
      },
      status: {
        availability: doctorForm.availability
      },
      contact: doctorForm.contact,
      assignedPatients: [],
      username: doctorForm.username.trim().toLowerCase() || doctorForm.name.split(' ').pop().toLowerCase(),
      password: doctorForm.password || 'password123'
    };

    try {
      await addDoctor(newDoc);
      setShowModal(false);
    } catch (err) {
      alert('Failed to add doctor.');
    }
  };

  const handleAddNurse = async (e) => {
    e.preventDefault();
    const newNurse = {
      personalInfo: {
        name: nurseForm.name,
        age: parseInt(nurseForm.age) || 28,
        gender: nurseForm.gender
      },
      status: {
        availability: nurseForm.availability
      },
      shift: nurseForm.shift,
      contact: nurseForm.contact,
      assignedPatients: [],
      username: nurseForm.username.trim().toLowerCase() || nurseForm.name.split(' ')[0].toLowerCase(),
      password: nurseForm.password || 'password123'
    };

    try {
      await addNurse(newNurse);
      setShowModal(false);
    } catch (err) {
      alert('Failed to add nurse.');
    }
  };

  // Delete Actions
  const handleDeletePatient = async (id, name) => {
    if (window.confirm(`Are you absolutely sure you want to remove patient ${name} (ID: ${id}) from the active hospital database?`)) {
      try {
        await removePatient(id);
      } catch (err) {
        alert('Failed to delete patient.');
      }
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (window.confirm(`Are you absolutely sure you want to remove ${name} (ID: ${id})? This will also clear their assignments from all patients.`)) {
      try {
        await removeDoctor(id);
      } catch (err) {
        alert('Failed to delete doctor.');
      }
    }
  };

  const handleDeleteNurse = async (id, name) => {
    if (window.confirm(`Are you absolutely sure you want to remove nurse ${name} (ID: ${id})? This will also clear their assignments from all patients.`)) {
      try {
        await removeNurse(id);
      } catch (err) {
        alert('Failed to delete nurse.');
      }
    }
  };

  // Searching logic
  const filteredPatients = patients.filter(p => 
    p.personalInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.personalInfo?.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDoctors = doctors.filter(d => 
    d.personalInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.doctorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.professionalInfo?.field?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNurses = nurses.filter(n => 
    n.personalInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.nurseId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.shift?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-manage-container">
      <div className="admin-manage-header">
        <div>
          <h1>Hospital Registry Management</h1>
          <p className="subtitle">Secure administrative operations console for managing hospital staff and patient directories.</p>
        </div>
        
        <button className="add-resource-btn" onClick={handleOpenModal}>
          <Plus size={18} />
          <span>Add New {activeTab.slice(0, -1)}</span>
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="admin-manage-tabs-bar">
        <div className="tabs-wrapper">
          <button 
            className={`tab-item-btn ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => { setActiveTab('patients'); setSearchTerm(''); }}
          >
            <HeartPulse size={18} />
            <span>Patients ({patients.length})</span>
          </button>
          <button 
            className={`tab-item-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => { setActiveTab('doctors'); setSearchTerm(''); }}
          >
            <Briefcase size={18} />
            <span>Doctors ({doctors.length})</span>
          </button>
          <button 
            className={`tab-item-btn ${activeTab === 'nurses' ? 'active' : ''}`}
            onClick={() => { setActiveTab('nurses'); setSearchTerm(''); }}
          >
            <User size={18} />
            <span>Nurses ({nurses.length})</span>
          </button>
        </div>

        <div className="search-bar-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Display Table */}
      {activeTab === 'patients' && (
        <div className="glass-panel resource-table-card">
          <table className="resource-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age / Gender</th>
                <th>Location</th>
                <th>Vitals Status</th>
                <th>Care Doctor</th>
                <th>Care Nurse</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-row-text">No patients found matching the search criteria.</td>
                </tr>
              ) : (
                filteredPatients.map(p => {
                  const pDoc = doctors.find(d => d.doctorId === p.assignedStaff?.doctorId);
                  const pNurse = nurses.find(n => n.nurseId === p.assignedStaff?.nurseId);
                  return (
                    <tr key={p.patientId}>
                      <td className="id-col">{p.patientId}</td>
                      <td className="name-col">{p.personalInfo?.name}</td>
                      <td>{p.personalInfo?.age} yrs / {p.personalInfo?.gender}</td>
                      <td>
                        <span className="location-badge">
                          <MapPin size={12} />
                          Room {p.personalInfo?.roomNumber}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge-inline ${p.status?.emergency ? 'critical' : 'stable'}`}>
                          {p.status?.condition || 'Stable'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {pDoc ? pDoc.personalInfo?.name : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Unassigned</span>}
                      </td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {pNurse ? pNurse.personalInfo?.name : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Unassigned</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="delete-icon-btn" 
                          onClick={() => handleDeletePatient(p.patientId, p.personalInfo?.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Doctors Display Table */}
      {activeTab === 'doctors' && (
        <div className="glass-panel resource-table-card">
          <table className="resource-table">
            <thead>
              <tr>
                <th>Doctor ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Experience</th>
                <th>Availability</th>
                <th>Username</th>
                <th>Contact</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-row-text">No doctors found matching the search criteria.</td>
                </tr>
              ) : (
                filteredDoctors.map(d => (
                  <tr key={d.doctorId}>
                    <td className="id-col">{d.doctorId}</td>
                    <td className="name-col">{d.personalInfo?.name}</td>
                    <td>
                      <span className="dept-badge">{d.professionalInfo?.field}</span>
                    </td>
                    <td>{d.professionalInfo?.experienceYears} Years</td>
                    <td>
                      <span className={`status-badge-inline ${d.status?.availability === 'On Duty' ? 'active' : 'inactive'}`}>
                        {d.status?.availability || 'On Duty'}
                      </span>
                    </td>
                    <td className="credential-hint">
                      <Key size={12} />
                      {d.username || 'N/A'}
                    </td>
                    <td>{d.contact}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="delete-icon-btn" 
                        onClick={() => handleDeleteDoctor(d.doctorId, d.personalInfo?.name)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Nurses Display Table */}
      {activeTab === 'nurses' && (
        <div className="glass-panel resource-table-card">
          <table className="resource-table">
            <thead>
              <tr>
                <th>Nurse ID</th>
                <th>Name</th>
                <th>Age / Gender</th>
                <th>Active Shift</th>
                <th>Availability</th>
                <th>Username</th>
                <th>Contact</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNurses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-row-text">No nurses found matching the search criteria.</td>
                </tr>
              ) : (
                filteredNurses.map(n => (
                  <tr key={n.nurseId}>
                    <td className="id-col">{n.nurseId}</td>
                    <td className="name-col">{n.personalInfo?.name}</td>
                    <td>{n.personalInfo?.age} yrs / {n.personalInfo?.gender}</td>
                    <td>
                      <span className="shift-badge">{n.shift}</span>
                    </td>
                    <td>
                      <span className={`status-badge-inline ${n.status?.availability === 'On Duty' ? 'active' : 'inactive'}`}>
                        {n.status?.availability || 'On Duty'}
                      </span>
                    </td>
                    <td className="credential-hint">
                      <Key size={12} />
                      {n.username || 'N/A'}
                    </td>
                    <td>{n.contact}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="delete-icon-btn" 
                        onClick={() => handleDeleteNurse(n.nurseId, n.personalInfo?.name)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-backdrop-overlay">
          <div className="glass-panel modal-card-content">
            <div className="modal-header">
              <h2>Add New {activeTab.slice(0, -1).toUpperCase()}</h2>
              <button className="close-x-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            {/* PATIENT FORM */}
            {activeTab === 'patients' && (
              <form onSubmit={handleAddPatient} className="modal-body-form">
                <div className="form-section-header">
                  <User size={16} />
                  <span>Personal Information</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Full Name</label>
                    <input 
                      type="text" required placeholder="e.g. Samuel Jackson" 
                      value={patientForm.name} onChange={(e) => setPatientForm({...patientForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Age</label>
                    <input 
                      type="number" required min="1" max="120" placeholder="e.g. 45" 
                      value={patientForm.age} onChange={(e) => setPatientForm({...patientForm, age: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Gender</label>
                    <select 
                      value={patientForm.gender} onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Room Number</label>
                    <input 
                      type="text" required placeholder="e.g. 304B" 
                      value={patientForm.roomNumber} onChange={(e) => setPatientForm({...patientForm, roomNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-section-header" style={{ marginTop: '1rem' }}>
                  <HeartPulse size={16} />
                  <span>Initial Vitals</span>
                </div>
                <div className="form-row-grid vitals-inputs">
                  <div className="form-group-item">
                    <label>Heart Rate (BPM)</label>
                    <input 
                      type="number" required placeholder="75" 
                      value={patientForm.heartRate} onChange={(e) => setPatientForm({...patientForm, heartRate: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Temp (°C)</label>
                    <input 
                      type="number" step="0.1" required placeholder="36.8" 
                      value={patientForm.temperature} onChange={(e) => setPatientForm({...patientForm, temperature: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>SpO2 (%)</label>
                    <input 
                      type="number" required min="50" max="100" placeholder="98" 
                      value={patientForm.spo2} onChange={(e) => setPatientForm({...patientForm, spo2: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Resp. Rate (BPM)</label>
                    <input 
                      type="number" required placeholder="16" 
                      value={patientForm.rr} onChange={(e) => setPatientForm({...patientForm, rr: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Systolic BP</label>
                    <input 
                      type="number" required placeholder="120" 
                      value={patientForm.bpSys} onChange={(e) => setPatientForm({...patientForm, bpSys: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Diastolic BP</label>
                    <input 
                      type="number" required placeholder="80" 
                      value={patientForm.bpDia} onChange={(e) => setPatientForm({...patientForm, bpDia: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-section-header" style={{ marginTop: '1rem' }}>
                  <ShieldAlert size={16} />
                  <span>Assigned Personnel (Optional)</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Assigned Doctor</label>
                    <select 
                      value={patientForm.doctorId} onChange={(e) => setPatientForm({...patientForm, doctorId: e.target.value})}
                    >
                      <option value="">-- No Doctor Assigned --</option>
                      {doctors.map(d => (
                        <option key={d.doctorId} value={d.doctorId}>{d.personalInfo?.name} ({d.professionalInfo?.field})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-item">
                    <label>Assigned Nurse</label>
                    <select 
                      value={patientForm.nurseId} onChange={(e) => setPatientForm({...patientForm, nurseId: e.target.value})}
                    >
                      <option value="">-- No Nurse Assigned --</option>
                      {nurses.map(n => (
                        <option key={n.nurseId} value={n.nurseId}>{n.personalInfo?.name} ({n.shift} Shift)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-actions-bar">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn-submit">Add Patient</button>
                </div>
              </form>
            )}

            {/* DOCTOR FORM */}
            {activeTab === 'doctors' && (
              <form onSubmit={handleAddDoctor} className="modal-body-form">
                <div className="form-section-header">
                  <User size={16} />
                  <span>Personal Details</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Doctor Name</label>
                    <input 
                      type="text" required placeholder="Dr. Sarah Jenkins" 
                      value={doctorForm.name} onChange={(e) => setDoctorForm({...doctorForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Age</label>
                    <input 
                      type="number" required placeholder="e.g. 40" 
                      value={doctorForm.age} onChange={(e) => setDoctorForm({...doctorForm, age: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Gender</label>
                    <select 
                      value={doctorForm.gender} onChange={(e) => setDoctorForm({...doctorForm, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-section-header" style={{ marginTop: '1rem' }}>
                  <Briefcase size={16} />
                  <span>Professional Details</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Department / Specialty</label>
                    <select 
                      value={doctorForm.field} onChange={(e) => setDoctorForm({...doctorForm, field: e.target.value})}
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Gynaecology">Gynaecology</option>
                      <option value="Urology">Urology</option>
                      <option value="Oncology">Oncology</option>
                      <option value="Pediatrics">Pediatrics</option>
                    </select>
                  </div>
                  <div className="form-group-item">
                    <label>Experience (Years)</label>
                    <input 
                      type="number" required placeholder="e.g. 8" 
                      value={doctorForm.experienceYears} onChange={(e) => setDoctorForm({...doctorForm, experienceYears: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Availability</label>
                    <select 
                      value={doctorForm.availability} onChange={(e) => setDoctorForm({...doctorForm, availability: e.target.value})}
                    >
                      <option value="On Duty">On Duty</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                  <div className="form-group-item">
                    <label>Contact Info</label>
                    <input 
                      type="text" placeholder="Ext 405" 
                      value={doctorForm.contact} onChange={(e) => setDoctorForm({...doctorForm, contact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-section-header" style={{ marginTop: '1rem' }}>
                  <Key size={16} />
                  <span>Access Credentials</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Username</label>
                    <input 
                      type="text" required placeholder="e.g. jenkins" 
                      value={doctorForm.username} onChange={(e) => setDoctorForm({...doctorForm, username: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Password</label>
                    <input 
                      type="password" required placeholder="e.g. secret123" 
                      value={doctorForm.password} onChange={(e) => setDoctorForm({...doctorForm, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="modal-actions-bar">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn-submit">Add Doctor</button>
                </div>
              </form>
            )}

            {/* NURSE FORM */}
            {activeTab === 'nurses' && (
              <form onSubmit={handleAddNurse} className="modal-body-form">
                <div className="form-section-header">
                  <User size={16} />
                  <span>Personal Details</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Nurse Name</label>
                    <input 
                      type="text" required placeholder="e.g. Alice Johnson" 
                      value={nurseForm.name} onChange={(e) => setNurseForm({...nurseForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Age</label>
                    <input 
                      type="number" required placeholder="e.g. 29" 
                      value={nurseForm.age} onChange={(e) => setNurseForm({...nurseForm, age: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Gender</label>
                    <select 
                      value={nurseForm.gender} onChange={(e) => setNurseForm({...nurseForm, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-section-header" style={{ marginTop: '1rem' }}>
                  <Briefcase size={16} />
                  <span>Shift & Duty Status</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Active Shift</label>
                    <select 
                      value={nurseForm.shift} onChange={(e) => setNurseForm({...nurseForm, shift: e.target.value})}
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                  <div className="form-group-item">
                    <label>Availability</label>
                    <select 
                      value={nurseForm.availability} onChange={(e) => setNurseForm({...nurseForm, availability: e.target.value})}
                    >
                      <option value="On Duty">On Duty</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Contact Info</label>
                    <input 
                      type="text" placeholder="Ext 505" 
                      value={nurseForm.contact} onChange={(e) => setNurseForm({...nurseForm, contact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-section-header" style={{ marginTop: '1rem' }}>
                  <Key size={16} />
                  <span>Access Credentials</span>
                </div>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Username</label>
                    <input 
                      type="text" required placeholder="e.g. alice" 
                      value={nurseForm.username} onChange={(e) => setNurseForm({...nurseForm, username: e.target.value})}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Password</label>
                    <input 
                      type="password" required placeholder="e.g. secret123" 
                      value={nurseForm.password} onChange={(e) => setNurseForm({...nurseForm, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="modal-actions-bar">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn-submit">Add Nurse</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManage;
