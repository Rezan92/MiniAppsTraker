import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const SettingsLayout = () => {
  const { userData } = useAuth();

  // Basic RBAC: If not admin, they can't see most settings, but we'll protect the tabs themselves 
  // or restrict the layout. For now, we assume this is the main Settings shell.
  // We'll just show the shell, and tabs can protect themselves, or we conditionally hide links.
  const isAdmin = userData?.role === 'admin';

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Side Navigation */}
      <div className="w-64 bg-surface-container-lowest border-r border-outline-variant p-4">
        <h2 className="font-title-md text-title-md text-on-surface mb-4 px-2">Settings</h2>
        <nav className="space-y-1">
          {isAdmin && (
            <>
              <NavLink 
                to="/settings/company"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg font-body-md text-sm transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>storefront</span>
                Company Profile
              </NavLink>
              <NavLink 
                to="/settings/team"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg font-body-md text-sm transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
                Team Management
              </NavLink>
              <NavLink 
                to="/settings/services"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg font-body-md text-sm transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>handyman</span>
                Service Configuration
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-background overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
