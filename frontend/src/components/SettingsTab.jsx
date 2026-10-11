import React, { useState } from 'react';
import PasswordSection from './settings/PasswordSection';
import MembersSection from './settings/MembersSection';
import AdminsSection from './settings/AdminsSection';
import ProjectsSection from './settings/ProjectsSection';
import WeekSection from './settings/WeekSection';

export default function SettingsTab({ user, onProjectsChanged }) {
  const sections = [
    { key: 'password', label: 'Passwort ändern' },
    ...(user.admin ? [
      { key: 'members', label: 'Projektzuordnung' },
      { key: 'projects', label: 'Projekte' },
      { key: 'admins', label: 'Admin-Rechte' },
      { key: 'week', label: 'Report-Woche' }
    ] : [])
  ];
  const [active, setActive] = useState('password');

  return (
    <div className="settings-layout">
      <div className="settings-nav">
        {sections.map(s => (
          <button
            key={s.key}
            type="button"
            className={active === s.key ? 'active' : ''}
            onClick={() => setActive(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="settings-panel">
        {active === 'password' && <PasswordSection />}
        {active === 'members' && <MembersSection user={user} onProjectsChanged={onProjectsChanged} />}
        {active === 'projects' && <ProjectsSection onProjectsChanged={onProjectsChanged} />}
        {active === 'admins' && <AdminsSection user={user} />}
        {active === 'week' && <WeekSection />}
      </div>
    </div>
  );
}
