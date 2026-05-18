import React, { useState } from 'react';
import { Users, ShieldAlert, Activity, Stethoscope, HeartPulse, Search } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [searchTerm, setSearchTerm] = useState('');

  const { patients, doctors, nurses } = useDatabase();

  const getDoctorName = (pat) => {
    const docId = pat.assignedStaff?.doctorId;
    const doc = doctors.find(d => d.doctorId === docId);
    return doc ? (doc.personalInfo?.name || 'Unassigned') : 'Unassigned';
  };

  const getNurseName = (pat) => {
    const nurseId = pat.assignedStaff?.nurseId;
    const nurse = nurses.find(n => n.nurseId === nurseId);
    return nurse ? (nurse.personalInfo?.name || 'Unassigned') : 'Unassigned';
  };

  const getCriticalityStyle = (level) => {
    switch (level) {
      case 'Stable': return { color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' };
      case 'Severe': return { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' };
      case 'Critical': return { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)' };
      default: return { color: 'var(--text-muted)', background: 'rgba(0, 0, 0, 0.1)' };
    }
  };

  const getStatusStyle = (status) => {
    return status === 'On Duty' 
      ? { color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }
      : { color: 'var(--text-muted)', background: 'rgba(0, 0, 0, 0.05)' };
  };

  const filteredPatients = patients.filter(p => {
    const name = p.personalInfo?.name || '';
    const id = p.patientId || '';
    const docName = getDoctorName(p);
    const nurseName = getNurseName(p);

    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           docName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           nurseName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredDoctors = doctors.filter(d => {
    const name = d.personalInfo?.name || '';
    const id = d.doctorId || '';
    const specialization = d.professionalInfo?.field || '';

    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           specialization.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredNurses = nurses.filter(n => {
    const name = n.personalInfo?.name || '';
    const id = n.nurseId || '';

    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ padding: '0 0 2rem 0' }}>
      
      {/* Header section */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Directory Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Comprehensive view of hospital personnel and patients</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Patients Stat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '8px' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Patients</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{patients.length}</div>
            </div>
          </div>

          {/* Doctors Stat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px', borderRadius: '8px' }}>
              <Stethoscope size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Doctors</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{doctors.length}</div>
            </div>
          </div>

          {/* Nurses Stat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '10px', borderRadius: '8px' }}>
              <HeartPulse size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nurses</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{nurses.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        
        {/* Tabs and Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setActiveTab('patients')}
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: '8px', 
                fontWeight: 600, 
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'patients' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'patients' ? 'white' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              All Patients
            </button>
            <button 
              onClick={() => setActiveTab('doctors')}
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: '8px', 
                fontWeight: 600, 
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'doctors' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'doctors' ? 'white' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              Doctors Directory
            </button>
            <button 
              onClick={() => setActiveTab('nurses')}
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: '8px', 
                fontWeight: 600, 
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'nurses' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'nurses' ? 'white' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              Nurses Directory
            </button>
          </div>
          
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', 
                border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' 
              }}
            />
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          
          {activeTab === 'patients' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700 }}>
                  <th style={{ padding: '1rem 0.5rem' }}>ID</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Patient Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Room Details</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Assigned Doctor</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Assigned Nurse</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Criticality</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s', fontSize: '0.95rem' }}>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>{patient.patientId}</td>
                    <td style={{ padding: '1.25rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>{patient.personalInfo?.name || 'Unknown'}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-muted)' }}>{patient.personalInfo?.roomNumber || 'N/A'}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-main)' }}>{getDoctorName(patient)}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-main)' }}>{getNurseName(patient)}</td>
                    <td style={{ padding: '1.25rem 0.5rem' }}>
                      <span style={{ 
                        ...getCriticalityStyle(patient.status?.condition || 'Stable'),
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        {patient.status?.condition || 'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'patients' && filteredPatients.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No patients found matching your search.</div>
          )}

          {activeTab === 'doctors' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700 }}>
                  <th style={{ padding: '1rem 0.5rem' }}>ID</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Doctor Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Specialization</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Contact</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s', fontSize: '0.95rem' }}>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>{doctor.doctorId}</td>
                    <td style={{ padding: '1.25rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>{doctor.personalInfo?.name || 'Unknown'}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-main)' }}>{doctor.professionalInfo?.field || 'General'}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-muted)' }}>{doctor.contact || 'Ext 400'}</td>
                    <td style={{ padding: '1.25rem 0.5rem' }}>
                      <span style={{ 
                        ...getStatusStyle(doctor.status?.availability || 'Off Duty'),
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        {doctor.status?.availability || 'Off Duty'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'doctors' && filteredDoctors.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No doctors found matching your search.</div>
          )}

          {activeTab === 'nurses' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700 }}>
                  <th style={{ padding: '1rem 0.5rem' }}>ID</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Nurse Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Shift</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Contact</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredNurses.map((nurse, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s', fontSize: '0.95rem' }}>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>{nurse.nurseId}</td>
                    <td style={{ padding: '1.25rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>{nurse.personalInfo?.name || 'Unknown'}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-main)' }}>{nurse.shift || 'Morning'}</td>
                    <td style={{ padding: '1.25rem 0.5rem', color: 'var(--text-muted)' }}>{nurse.contact || 'Ext 500'}</td>
                    <td style={{ padding: '1.25rem 0.5rem' }}>
                      <span style={{ 
                        ...getStatusStyle(nurse.status?.availability || 'Off Duty'),
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem', 
                        fontWeight: 600 
                      }}>
                        {nurse.status?.availability || 'Off Duty'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'nurses' && filteredNurses.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No nurses found matching your search.</div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Admin;
