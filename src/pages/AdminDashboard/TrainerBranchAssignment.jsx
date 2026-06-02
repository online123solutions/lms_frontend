import { useEffect, useState } from 'react';
import { fetchAdminTrainers, assignTrainerBranches, fetchDepartments } from '../../api/adminAPIservice';

export default function TrainerBranchAssignment() {
  const [trainers, setTrainers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // trainer id being saved
  const [message, setMessage] = useState({ id: null, text: '', error: false });

  useEffect(() => {
    const load = async () => {
      const [tRes, dRes] = await Promise.all([fetchAdminTrainers(), fetchDepartments()]);
      if (tRes.success) setTrainers(tRes.data);
      if (dRes.success) setDepartments(dRes.data);
      setLoading(false);
    };
    load();
  }, []);

  const toggleDept = (trainer, dept) => {
    setTrainers(prev =>
      prev.map(t => {
        if (t.id !== trainer.id) return t;
        const current = t.assigned_departments || [];
        const updated = current.includes(dept)
          ? current.filter(d => d !== dept)
          : [...current, dept];
        return { ...t, assigned_departments: updated };
      })
    );
  };

  const save = async (trainer) => {
    setSaving(trainer.id);
    const res = await assignTrainerBranches(trainer.id, trainer.assigned_departments);
    setMessage({
      id: trainer.id,
      text: res.success ? 'Saved successfully.' : 'Failed to save.',
      error: !res.success,
    });
    setSaving(null);
    setTimeout(() => setMessage({ id: null, text: '', error: false }), 3000);
  };

  if (loading) return <div style={{ padding: 24 }}>Loading trainers…</div>;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
      <h3 style={{ marginBottom: 4, fontWeight: 700 }}>Trainer Branch Assignment</h3>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        Select which branches each trainer can view. When branches are assigned, the trainer sees
        trainees and reports from those branches only. If none are assigned, they see their own
        department by default.
      </p>

      {trainers.length === 0 && (
        <p style={{ color: '#999' }}>No trainers found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {trainers.map(trainer => (
          <div
            key={trainer.id}
            style={{
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {/* Trainer header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#393939', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}
              >
                {(trainer.name || trainer.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{trainer.name || trainer.username}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  @{trainer.username} &nbsp;·&nbsp; Own dept: <strong>{trainer.department || '—'}</strong>
                </div>
              </div>
            </div>

            {/* Branch checkboxes */}
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginBottom: 14,
              }}
            >
              {departments.map(dept => {
                const val = dept.value ?? dept;
                const label = dept.label ?? dept;
                const checked = (trainer.assigned_departments || []).includes(val);
                return (
                  <label
                    key={val}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px',
                      border: `1.5px solid ${checked ? '#1a73e8' : '#ccc'}`,
                      borderRadius: 20,
                      background: checked ? '#e8f0fe' : '#f9f9f9',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: checked ? 600 : 400,
                      color: checked ? '#1a73e8' : '#444',
                      transition: 'all 0.15s',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDept(trainer, val)}
                      style={{ display: 'none' }}
                    />
                    {checked && <span style={{ fontSize: 11 }}>✓</span>}
                    {label}
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => save(trainer)}
                disabled={saving === trainer.id}
                style={{
                  padding: '7px 20px',
                  background: '#1a73e8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: saving === trainer.id ? 'not-allowed' : 'pointer',
                  opacity: saving === trainer.id ? 0.7 : 1,
                }}
              >
                {saving === trainer.id ? 'Saving…' : 'Save'}
              </button>

              {(trainer.assigned_departments || []).length === 0 && (
                <span style={{ fontSize: 12, color: '#f59e0b' }}>
                  No branches assigned — using own department
                </span>
              )}
              {(trainer.assigned_departments || []).length > 0 && (
                <span style={{ fontSize: 12, color: '#22c55e' }}>
                  {trainer.assigned_departments.length} branch(es) assigned
                </span>
              )}

              {message.id === trainer.id && (
                <span style={{ fontSize: 12, color: message.error ? '#ef4444' : '#22c55e' }}>
                  {message.text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
