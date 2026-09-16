import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { AiCopilotWidget } from '../ai/AiCopilotWidget';
import { Tooltip } from '../common/Tooltip';
import { NetworkBanner } from './NetworkBanner';

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileWsOpen, setMobileWsOpen] = useState(false);
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

  // Automatically close mobile navigation drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

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
    <div className="antialiased min-h-[100dvh] flex font-body-md text-body-md text-on-surface bg-background">
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
      <main className={`flex-1 ${isCollapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'} flex flex-col min-h-[100dvh] h-[100dvh] bg-surface-bright relative overflow-hidden transition-all duration-300 ease-in-out`}>
        <NetworkBanner />
        
        {/* TopAppBar */}
        <header className="bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3 md:px-6 md:py-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            {/* Mobile Workspace Name (Static, no duplicate dropdown) */}
            <div className="md:hidden flex items-center">
              <h2 className="font-headline-md text-base font-bold text-gray-900 truncate max-w-[160px] sm:max-w-[240px]">{tenantName}</h2>
            </div>

            {/* Desktop Workspace Switcher */}
            <div 
              className="hidden md:flex items-center gap-2 cursor-pointer p-2 -ml-2 rounded-lg transition-colors hover:bg-gray-100"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <h2 className="font-headline-md text-headline-md font-bold text-gray-900">{tenantName}</h2>
              <span className={`material-symbols-outlined text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </div>

            {/* Dropdown Menu (Desktop Only) */}
            {dropdownOpen && (
              <div className="hidden md:block absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
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
          
          <div className="flex justify-end items-center gap-2 md:gap-4">
            <button className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="User Profile"
                className="w-9 h-9 md:w-8 md:h-8 rounded-full overflow-hidden border border-gray-200 hover:border-primary transition-colors bg-gray-100 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                 <span className="material-symbols-outlined text-gray-500 text-lg md:text-base">person</span>
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
        <div className={`flex-1 ${isCalendar ? 'overflow-hidden p-2 md:p-3 flex flex-col min-h-0 relative z-0' : 'overflow-auto p-4 md:p-8'} pb-[calc(5rem+var(--sab,0px))] md:pb-8`}>
          <div className={isCalendar ? 'w-full flex-1 flex flex-col min-h-0' : 'max-w-[1440px] mx-auto'}>
            {children || <Outlet />}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[calc(0.5rem+var(--sab,0px))] pt-1 px-1 flex justify-around items-center shadow-lg"
      >
        {[
          { to: '/', label: 'Home', icon: 'dashboard', end: true },
          { to: '/clients', label: 'Clients', icon: 'group', end: false },
          { to: '/jobs', label: 'Jobs', icon: 'work', end: false },
          { to: '/calendar', label: 'Calendar', icon: 'calendar_month', end: false },
          { to: '/invoices', label: 'Invoices', icon: 'receipt_long', end: false },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `flex flex-col items-center justify-center min-h-[44px] min-w-[44px] flex-1 py-1 px-1 rounded-lg transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            {({ isActive }) => (
              <>
                <span 
                  className="material-symbols-outlined text-[22px]" 
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 tracking-tight font-body-md">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Off-Canvas Mobile Navigation Drawer */}
      <div 
        className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
          mobileDrawerOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible delay-300'
        }`}
      >
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            mobileDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div 
          className={`relative w-[285px] max-w-[85vw] h-full bg-inverse-surface text-white flex flex-col p-4 shadow-2xl overflow-y-auto pt-[calc(1rem+var(--sat,0px))] pb-[calc(1rem+var(--sab,0px))] z-10 transition-transform duration-300 ease-in-out ${
            mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-700/80 mb-4">
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 bg-primary rounded flex items-center justify-center font-headline-md font-bold text-black shrink-0">
                {tenantName.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="ml-3 min-w-0">
                <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white leading-tight truncate">{tenantName}</h1>
                <span className="font-label-caps text-label-caps text-gray-400 block truncate">{tenantSubtitle}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Back"
              title="Close navigation menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-gray-300 hover:text-white rounded-lg cursor-pointer transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          </div>

          {/* Workspace Switcher Accordion */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setMobileWsOpen(prev => !prev)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 text-gray-200 text-sm font-medium transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                <span className="truncate">{tenantName}</span>
              </div>
              <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform ${mobileWsOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {mobileWsOpen && (
              <div className="mt-2 space-y-1 bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                {workspaces.map(ws => (
                  <button
                    key={ws.tenant_id}
                    onClick={() => {
                      handleSwitchWorkspace(ws.tenant_id);
                      setMobileDrawerOpen(false);
                    }}
                    disabled={isSwitching}
                    className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between text-xs transition-colors min-h-[40px] ${
                      ws.tenant_id === activeTenantId ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.tenant_id === activeTenantId && (
                      <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setCreateModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-md flex items-center gap-2 text-xs text-primary hover:bg-gray-800 transition-colors font-medium border-t border-gray-800 mt-1 pt-2 min-h-[40px]"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Create New Workspace
                </button>
              </div>
            )}
          </div>

          {/* Drawer Navigation Links */}
          <div className="space-y-1 flex-1">
            <NavLink
              to="/settings"
              onClick={() => setMobileDrawerOpen(false)}
              className={({ isActive }) => `flex items-center h-11 px-3 rounded-lg transition-colors min-h-[44px] ${
                isActive ? 'bg-gray-800 text-white font-bold' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-gray-400 mr-3">settings</span>
              <span className="text-sm">Settings</span>
            </NavLink>

            <NavLink
              to="/profile"
              onClick={() => setMobileDrawerOpen(false)}
              className={({ isActive }) => `flex items-center h-11 px-3 rounded-lg transition-colors min-h-[44px] ${
                isActive ? 'bg-gray-800 text-white font-bold' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-gray-400 mr-3">person</span>
              <span className="text-sm">My Profile</span>
            </NavLink>

            <a
              href="#"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex items-center h-11 px-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors rounded-lg min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[20px] text-gray-400 mr-3">help</span>
              <span className="text-sm">Support</span>
            </a>
          </div>

          {/* Quick Add Job Button */}
          <button
            onClick={() => {
              setMobileDrawerOpen(false);
              navigate('/jobs');
            }}
            className="w-full h-11 flex items-center justify-center px-3 bg-primary hover:bg-opacity-90 text-black rounded-lg font-body-md font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 duration-150 cursor-pointer min-h-[44px] mb-4"
          >
            <span className="material-symbols-outlined text-black text-xl mr-2">add</span>
            Add Job
          </button>

          {/* User Info & Sign Out Footer */}
          <div className="pt-4 border-t border-gray-700/80">
            <div className="mb-3 px-1">
              <p className="text-sm font-medium text-white truncate">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <AuthContextLogoutButton />
          </div>
        </div>
      </div>

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
