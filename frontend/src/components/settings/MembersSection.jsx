import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const memberKey = (projectId, userId) => `${projectId}:${userId}`;

// Matrix: one row per user, one column per project, a role select per cell.
export default function MembersSection({ user, onProjectsChanged }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState({});
  const [leads, setLeads] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/admin/users'), api('/admin/projects'), api('/admin/members'), api('/admin/leads')])
      .then(([u, p, m, l]) => {
        setUsers(u);
        setProjects(p);
        setRoles(Object.fromEntries(m.map(x => [memberKey(x.project_id, x.user_id), x.role])));
        setLeads(new Set(l.map(x => memberKey(x.project_id, x.user_id))));
      })
      .catch(e => setError(e.message));
  }, []);

  const change = async (projectId, userId, value) => {
    const key = memberKey(projectId, userId);
    const previous = roles[key];
    setError('');
    setRoles(r => ({ ...r, [key]: value }));
    try {
      await api('/admin/members', {
        method: 'PUT',
        body: JSON.stringify({ project_id: projectId, user_id: userId, role: value || null })
      });
      if (userId === user.id) onProjectsChanged();
    } catch (e) {
      setRoles(r => ({ ...r, [key]: previous }));
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Projektzuordnung</h2>
      <p className="muted">Lege fest, wer welches Projekt sehen bzw. darin schreiben darf.</p>
      {error && <p className="error">{error}</p>}

      {projects.length === 0 ? (
        <p className="muted">Noch keine Projekte angelegt.</p>
      ) : (
        <div className="matrix-wrapper">
          <table className="matrix">
            <thead>
              <tr>
                <th>Benutzer</th>
                {projects.map(p => <th key={p.id}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="matrix-user">
                    {u.display_name || u.username}
                    {u.display_name && <span className="muted"> ({u.username})</span>}
                  </td>
                  {projects.map(p => {
                    const value = roles[memberKey(p.id, u.id)] || '';
                    const isLead = leads.has(memberKey(p.id, u.id));
                    return (
                      <td key={p.id}>
                        <select
                          className={`role-select ${value || 'none'}`}
                          value={value}
                          onChange={e => change(p.id, u.id, e.target.value)}
                        >
                          {/* A project lead always has "Lesen+Schreiben" until the lead role is removed. */}
                          <option value="" disabled={isLead}>–</option>
                          <option value="read" disabled={isLead}>Lesen</option>
                          <option value="write">Lesen+Schreiben</option>
                        </select>
                        {isLead && <span className="lead-badge" title="Projektleitung">PL</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
