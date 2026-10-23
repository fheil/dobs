import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const MAX_LEADS = 2;
const label = u => (u.display_name ? `${u.display_name} (${u.username})` : u.username);

// One row per project, up to two lead selects.
export default function LeadsSection({ user, onProjectsChanged }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [leads, setLeads] = useState({}); // projectId -> [userId, ...]
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/admin/users'), api('/admin/projects'), api('/admin/leads')])
      .then(([u, p, l]) => {
        setUsers(u);
        setProjects(p);
        const map = {};
        for (const { project_id, user_id } of l) (map[project_id] ||= []).push(user_id);
        setLeads(map);
      })
      .catch(e => setError(e.message));
  }, []);

  const change = async (projectId, slot, value) => {
    const current = leads[projectId] || [];
    const next = [...current];
    next[slot] = value ? Number(value) : null;
    const ids = [...new Set(next.filter(Boolean))];
    setError('');
    setLeads(l => ({ ...l, [projectId]: ids }));
    try {
      const res = await api(`/admin/projects/${projectId}/leads`, { method: 'PUT', body: JSON.stringify({ user_ids: ids }) });
      setLeads(l => ({ ...l, [projectId]: res.leads.map(x => x.user_id) }));
      // Becoming a lead may have given you access to a new project.
      if (ids.includes(user.id) && !current.includes(user.id)) onProjectsChanged();
    } catch (e) {
      setLeads(l => ({ ...l, [projectId]: current }));
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Projektleitung</h2>
      <p className="muted">
        Bis zu {MAX_LEADS} Personen pro Projekt. Projektleitungen haben immer „Lesen+Schreiben“ – sie werden
        automatisch zugeordnet bzw. hochgestuft. Zurückstufen oder entfernen lässt sich die Projektzuordnung erst,
        wenn die Person nicht mehr Projektleitung ist.
      </p>
      {error && <p className="error">{error}</p>}

      {projects.length === 0 ? (
        <p className="muted">Noch keine Projekte angelegt.</p>
      ) : (
        <div className="matrix-wrapper">
          <table className="matrix">
            <thead>
              <tr>
                <th>Projekt</th>
                {Array.from({ length: MAX_LEADS }, (_, i) => <th key={i}>Projektleitung {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const current = leads[p.id] || [];
                return (
                  <tr key={p.id}>
                    <td className="matrix-user">{p.name}</td>
                    {Array.from({ length: MAX_LEADS }, (_, slot) => (
                      <td key={slot}>
                        <select
                          className={`role-select ${current[slot] ? 'write' : 'none'}`}
                          value={current[slot] ?? ''}
                          // The second slot only makes sense once the first is set.
                          disabled={slot > 0 && !current[0]}
                          onChange={e => change(p.id, slot, e.target.value)}
                        >
                          <option value="">–</option>
                          {users
                            .filter(u => u.id === current[slot] || !current.includes(u.id))
                            .map(u => <option key={u.id} value={u.id}>{label(u)}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
