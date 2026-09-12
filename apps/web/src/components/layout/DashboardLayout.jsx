import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { AiCopilotWidget } from '../ai/AiCopilotWidget';
import { Tooltip } from '../common/Tooltip';

export const DashboardLayout = ({ children }) => {
  const { user, userData } = useAuth();
  const { workspaces, currentWorkspace, activeTenantId, isSwitching, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess } = useToast();
  
  const isCalendar = location.pathname.startsWith('/calendar');
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (err) {
        console.warn('Failed to save sidebar state to localStorage:', err);
      }
      return next;
    });
  };

  // Handle URL toast params if any (e.g. from invite join)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toastParam = params.get('toast');
    if (toastParam === 'joined_workspace') {
      showSuccess('You have successfully joined the team workspace.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchWorkspace = async (targetId) => {
    if (targetId === activeTenantId) {
      setDropdownOpen(false);
      return;
    }
    setDropdownOpen(false);
    await switchWorkspace(targetId);
  };
  
  const tenantName = currentWorkspace?.name || "Loading..."; 
  const tenantSubtitle = currentWorkspace?.role === 'admin' ? "Business Admin" : "Employee";

  return (
    <div className="antialiased min-h-screen flex font-body-md text-body-md text-on-surface bg-background">
      {/* SideNavBar */}
      <nav className={`hidden md:flex bg-inverse-surface text-white font-body-md text-body-md docked left-0 h-full ${
        isCollapsed ? 'w-[80px]' : 'w-[280px]'
      } p-4 border-r border-on-surface-variant flat no shadows fixed top-0 flex-col z-40 transition-all duration-300 ease-in-out group/sidebar`}>
        {/* Floating Collapse / Expand Toggle Button on Outer Border */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-7 -right-3.5 z-50 w-7 h-7 rounded-full bg-gray-900 border border-gray-700 shadow-md text-gray-300 hover:text-white hover:bg-gray-800 flex items-center justify-center transition-all duration-200 cursor-pointer opacity-0 pointer-events-none group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto hover:scale-110 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">
            {isCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        {/* Tenant Branding Header */}
        <div className="mb-8 mt-2 flex items-center h-10 px-1">
          <div 
            className="w-10 h-10 bg-primary rounded flex items-center justify-center font-headline-md font-bold text-black shrink-0"
            title={isCollapsed ? tenantName : undefined}
          >
            {tenantName.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'
          }`}>
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white leading-tight truncate">{tenantName}</h1>
            <span className="font-label-caps text-label-caps text-gray-400 block truncate">{tenantSubtitle}</span>
          </div>
        </div>
        
        {/* Main Navigation Links */}
        <ul className="flex-1 space-y-[8px]">
          <li>
            <Tooltip text={isCollapsed ? "Dashboard" : null} position="right" className="w-full">
              <NavLink to="/" className={({ isActive }) => `relative group flex items-center h-11 px-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>dashboard</span>
                    </div>
                    <span className={`ml-3 font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'font-bold' : 'font-medium'} ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                      Dashboard
                    </span>
                  </>
                )}
              </NavLink>
            </Tooltip>
          </li>
          <li>
            <Tooltip text={isCollapsed ? "Clients" : null} position="right" className="w-full">
              <NavLink to="/clients" className={({ isActive }) => `relative group flex items-center h-11 px-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>group</span>
                    </div>
                    <span className={`ml-3 font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'font-bold' : 'font-medium'} ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                      Clients
                    </span>
                  </>
                )}
              </NavLink>
            </Tooltip>
          </li>
          <li>
            <Tooltip text={isCollapsed ? "Jobs" : null} position="right" className="w-full">
              <NavLink to="/jobs" className={({ isActive }) => `relative group flex items-center h-11 px-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>work</span>
                    </div>
                    <span className={`ml-3 font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'font-bold' : 'font-medium'} ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                      Jobs
                    </span>
                  </>
                )}
              </NavLink>
            </Tooltip>
          </li>
          <li>
            <Tooltip text={isCollapsed ? "Calendar" : null} position="right" className="w-full">
              <NavLink to="/calendar" className={({ isActive }) => `relative group flex items-center h-11 px-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>calendar_month</span>
                    </div>
                    <span className={`ml-3 font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'font-bold' : 'font-medium'} ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                      Calendar
                    </span>
                  </>
                )}
              </NavLink>
            </Tooltip>
          </li>
          <li>
            <Tooltip text={isCollapsed ? "Invoices" : null} position="right" className="w-full">
              <NavLink to="/invoices" className={({ isActive }) => `relative group flex items-center h-11 px-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>receipt_long</span>
                    </div>
                    <span className={`ml-3 font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'font-bold' : 'font-medium'} ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                      Invoices
                    </span>
                  </>
                )}
              </NavLink>
            </Tooltip>
          </li>
        </ul>
        
        {/* Bottom Utility Links */}
        <ul className="mt-auto pt-4 border-t border-gray-700 space-y-2 mb-4">
          <li>
            <Tooltip text={isCollapsed ? "Settings" : null} position="right" className="w-full">
              <NavLink to="/settings" className={({ isActive }) => `relative group flex items-center h-11 px-3 transition-colors duration-200 rounded-lg ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>settings</span>
                    </div>
                    <span className={`ml-3 font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'font-bold' : 'font-medium'} ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                      Settings
                    </span>
                  </>
                )}
              </NavLink>
            </Tooltip>
          </li>
          <li>
            <Tooltip text={isCollapsed ? "Support" : null} position="right" className="w-full">
              <a href="#" className="flex items-center h-11 px-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 rounded-lg group">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors">help</span>
                </div>
                <span className={`ml-3 font-body-md font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'}`}>
                  Support
                </span>
              </a>
            </Tooltip>
          </li>
        </ul>
        
        {/* Add Job Action Button */}
        <Tooltip text={isCollapsed ? "Add Job" : null} position="right" className="w-full">
          <button 
            onClick={() => navigate('/jobs')}
            aria-label="Add Job"
            className="w-full h-11 flex items-center justify-center px-3 bg-primary hover:bg-opacity-90 text-black rounded-lg font-body-md font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 duration-150 cursor-pointer overflow-hidden"
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-black text-xl">add</span>
            </div>
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out font-bold ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none ml-0' : 'opacity-100 max-w-[120px] ml-2'
            }`}>
              Add Job
            </span>
          </button>
        </Tooltip>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 ${isCollapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'} flex flex-col h-screen bg-surface-bright relative overflow-hidden transition-all duration-300 ease-in-out`}>
        
        {/* TopAppBar */}
        <header className="bg-white border-b border-gray-200 flex justify-between items-center px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            {/* Workspace Switcher */}
            <div 
              className="flex items-center gap-2 cursor-pointer p-2 -ml-2 rounded-lg transition-colors hover:bg-gray-100"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <h2 className="font-headline-md text-headline-md font-bold text-gray-900">{tenantName}</h2>
              <span className={`material-symbols-outlined text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Workspace</span>
                </div>
                {workspaces.map(ws => (
                  <button
                    key={ws.tenant_id}
                    onClick={() => handleSwitchWorkspace(ws.tenant_id)}
                    disabled={isSwitching}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${ws.tenant_id === activeTenantId ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${ws.tenant_id === activeTenantId ? 'font-bold text-primary' : ''}`}>{ws.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{ws.role}</span>
                    </div>
                    {ws.tenant_id === activeTenantId && (
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-2">
                  <button 
                    onClick={() => { setDropdownOpen(false); setCreateModalOpen(true); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors font-medium text-sm"
                  >
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>add</span>
                    Create New Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:border-primary transition-colors bg-gray-100 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                 <span className="material-symbols-outlined text-gray-500">person</span>
              </button>

              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 mb-2">
                    <p className="text-sm font-medium text-gray-900 truncate" title={user?.user_metadata?.full_name || 'My Profile'}>
                      {user?.user_metadata?.full_name || 'My Profile'}
                    </p>
                    <p className="text-xs text-gray-500 truncate" title={user?.email}>{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
                    My Profile
                  </button>
                  {/* Real Sign Out Button */}
                  <div className="border-t border-gray-100 mt-2"></div>
                  <AuthContextLogoutButton />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Canvas */}
        <div className={`flex-1 ${isCalendar ? 'overflow-hidden p-2 md:p-3 flex flex-col min-h-0 relative z-0' : 'overflow-auto p-4 md:p-8'}`}>
          <div className={isCalendar ? 'w-full flex-1 flex flex-col min-h-0' : 'max-w-[1440px] mx-auto'}>
            {children || <Outlet />}
          </div>
        </div>
      </main>

      <CreateWorkspaceModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      {/* Global AI Copilot Floating Widget */}
      <AiCopilotWidget />
    </div>
  );
};

// Extracted to grab signOut from context inside the component
const AuthContextLogoutButton = () => {
  const { signOut } = useAuth();
  
  const handleLogOut = async () => {
    await signOut();
    window.location.href = '/login'; // Hard redirect to clear cache
  };

  return (
    <button 
      onClick={handleLogOut}
      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-error transition-colors text-sm flex items-center gap-2 mt-1"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
      Log Out
    </button>
  );
};
