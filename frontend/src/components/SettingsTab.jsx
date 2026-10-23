import React, { useState } from 'react';
import ProfileSection from './settings/ProfileSection';
import MembersSection from './settings/MembersSection';
import UsersSection from './settings/UsersSection';
import LeadsSection from './settings/LeadsSection';
import ProjectsSection from './settings/ProjectsSection';
import WeekSection from './settings/WeekSection';
import DeleteSection from './settings/DeleteSection';
import RegistrationSection from './settings/RegistrationSection';

export default function SettingsTab({ user, onUserChange, onProjectsChanged }) {
  const sections = [
    { key: 'profile', label: 'Profil' },
    { key: 'week', label: 'Report-Woche' },
    ...(user.admin ? [
      { key: 'members', label: 'Projektzuordnung' },
      { key: 'projects', label: 'Projekte' },
      { key: 'users', label: 'Benutzer' },
      { key: 'leads', label: 'Projektleitung' },
      { key: 'registration', label: 'Registrierung' },
      { key: 'delete', label: 'Löschen & Sperren' }
    ] : [])
  ];
  const [active, setActive] = useState('profile');

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
        {active === 'profile' && <ProfileSection user={user} onUserChange={onUserChange} />}
        {active === 'members' && <MembersSection user={user} onProjectsChanged={onProjectsChanged} />}
        {active === 'projects' && <ProjectsSection onProjectsChanged={onProjectsChanged} />}
        {active === 'users' && <UsersSection user={user} onUserChange={onUserChange} />}
        {active === 'leads' && <LeadsSection user={user} onProjectsChanged={onProjectsChanged} />}
        {active === 'week' && <WeekSection />}
        {active === 'registration' && <RegistrationSection />}
        {active === 'delete' && <DeleteSection />}
      </div>
    </div>
  );
}
