import React, { useState } from 'react';
import { UserPlus, UserMinus, Save, Stethoscope, HeartPulse, Search } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const AdminAssignments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { patients, doctors, nurses, updatePatientAssignment } = useDatabase();

  const handleAssignmentChange = (patientId, role, value) => {
    updatePatientAssignment(patientId, role, value);
  };

  const removeAssignment = (patientId, role) => {
    updatePatientAssignment(patientId, role, '');
  };

  const filteredPatients = patients.filter(p => {
    const name = p.personalInfo?.name || '';
    const id = p.patientId || '';
    const room = p.personalInfo?.roomNumber || '';

    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           room.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ paddingBottom: '2rem' }}>
      
      {/* Header section */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Assign Personnel</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and update patient care teams</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', 
              border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' 
            }}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {filteredPatients.map(patient => {
          const assignedDocId = patient.assignedStaff?.doctorId || '';
          const assignedNurseId = patient.assignedStaff?.nurseId || '';

          return (
            <div key={patient.patientId} className="glass-panel" style={{ padding: '1.5rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{patient.personalInfo?.name || 'Unknown'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{patient.patientId}</span> • Room: {patient.personalInfo?.roomNumber || 'N/A'}</div>
                </div>
              </div>

              {/* Doctor Assignment */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <Stethoscope size={16} style={{ color: 'var(--primary)' }} />
                  Assigned Doctor
                </label>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={assignedDocId}
                    onChange={(e) => handleAssignmentChange(patient.patientId, 'doctorId', e.target.value)}
                    style={{ 
                      flex: 1, padding: '10px 12px', borderRadius: '8px', 
                      border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: assignedDocId ? 'var(--text-main)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- No Doctor Assigned --</option>
                    {doctors.map(doc => (
                      <option key={doc.doctorId} value={doc.doctorId}>{doc.personalInfo?.name || 'Unknown'}</option>
                    ))}
                  </select>
                  
                  {assignedDocId && (
                    <button 
                      onClick={() => removeAssignment(patient.patientId, 'doctorId')}
                      title="Remove Doctor"
                      style={{ 
                        padding: '0 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Nurse Assignment */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <HeartPulse size={16} style={{ color: 'var(--success)' }} />
                  Assigned Nurse
                </label>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={assignedNurseId}
                    onChange={(e) => handleAssignmentChange(patient.patientId, 'nurseId', e.target.value)}
                    style={{ 
                      flex: 1, padding: '10px 12px', borderRadius: '8px', 
                      border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: assignedNurseId ? 'var(--text-main)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- No Nurse Assigned --</option>
                    {nurses.map(nurse => (
                      <option key={nurse.nurseId} value={nurse.nurseId}>{nurse.personalInfo?.name || 'Unknown'}</option>
                    ))}
                  </select>

                  {assignedNurseId && (
                    <button 
                      onClick={() => removeAssignment(patient.patientId, 'nurseId')}
                      title="Remove Nurse"
                      style={{ 
                        padding: '0 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {filteredPatients.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No patients found matching "{searchTerm}"
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminAssignments;
