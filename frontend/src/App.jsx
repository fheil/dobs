import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckSquare, FolderX, LogOut, NotebookPen, Settings } from 'lucide-react';
import { api, resumeSession, setSession, watchSessionChanges } from './api';
import { today } from './dates';
import Auth from './components/Auth';
import JournalTab from './components/JournalTab';
import ReportTab from './components/ReportTab';
import ObstaclesTab from './components/ObstaclesTab';
import SettingsTab from './components/SettingsTab';

const TABS = [
  { id: 'journal', label: 'Journal', Icon: NotebookPen },
  { id: 'report', label: 'Report', Icon: CalendarDays },
  { id: 'obstacles', label: 'Hindernisse', Icon: AlertTriangle },
  { id: 'settings', label: 'Einstellungen', Icon: Settings }
];

const projectKey = user => `project:${user.id}`;

function readStoredProject(user) {
  try { return Number(localStorage.getItem(projectKey(user))) || null; } catch { return null; }
}

function MainApp({ user, logout }) {
  const [tab, setTab] = useState('journal');
  const [journalDate, setJournalDate] = useState(today());
  const [error, setError] = useState('');
  const [projects, setProjects] = useState(null);
  const [projectId, setProjectId] = useState(() => readStoredProject(user));

  const loadProjects = () => api('/projects')
    .then(list => {
      setProjects(list);
      // Fall back to the first project if the stored one is gone/unassigned.
      setProjectId(id => (list.some(p => p.id === id) ? id : list[0]?.id ?? null));
    })
    .catch(e => setError(e.message));

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    try {
      if (projectId) localStorage.setItem(projectKey(user), String(projectId));
    } catch { /* not persisted - fine */ }
  }, [projectId]);

  const project = projects?.find(p => p.id === projectId) || null;

  // Report and Obstacles link into the Journal page of a given day.
  const openDay = iso => {
    setJournalDate(iso);
    setTab('journal');
  };

  const switchTab = id => {
    setError('');
    setTab(id);
  };

  const tabProps = { key: projectId, project, user, onError: setError };

  return (
    <div className="app">
      <div className="app-top">
        <header>
          <div className="top-brand">
            <div className="brand-mark small">
              <CheckSquare />
            </div>
            <div>
              <strong>dobs</strong>
              <span>done tasks &amp; obstacles</span>
            </div>
          </div>
          <div className="user-menu">
            {projects?.length > 0 && (
              <select
                className="project-select"
                title="Projekt"
                value={projectId ?? ''}
                onChange={e => setProjectId(Number(e.target.value))}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.role === 'read' ? ' (nur Lesen)' : ''}
                  </option>
                ))}
              </select>
            )}
            <span>{user.username}</span>
            <button className="icon" title="Abmelden" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <nav>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => switchTab(id)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
      </div>

      <main>
        {error && <div className="error banner">❌ {error}</div>}

        {tab !== 'settings' && projects && !project && (
          <div className="empty">
            <FolderX size={48} />
            <h3>Kein Projekt zugeordnet</h3>
            <p>{user.admin
              ? 'Lege unter Einstellungen → Projekte ein Projekt an.'
              : 'Bitte einen Admin, dich einem Projekt zuzuordnen.'}</p>
          </div>
        )}

        {project && tab === 'journal' && <JournalTab {...tabProps} date={journalDate} onDateChange={setJournalDate} />}
        {project && tab === 'report' && <ReportTab {...tabProps} onOpenDay={openDay} />}
        {project && tab === 'obstacles' && <ObstaclesTab {...tabProps} onOpenDay={openDay} />}
        {tab === 'settings' && <SettingsTab user={user} onProjectsChanged={loadProjects} />}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(() => !!resumeSession());

  useEffect(() => watchSessionChanges(), []);

  useEffect(() => {
    if (!checking) return;
    api('/auth/me')
      .then(d => setUser(d.user))
      .catch(e => {
        setSession(null);
        setAuthError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return null;

  if (!user) return <Auth onLogin={setUser} error={authError} />;

  return (
    <MainApp
      key={user.id}
      user={user}
      logout={() => {
        setSession(null);
        setUser(null);
      }}
    />
  );
}
