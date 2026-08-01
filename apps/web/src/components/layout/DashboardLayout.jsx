import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const DashboardLayout = ({ children }) => {
  const { user, session, userData } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [workspaces, setWorkspaces] = useState([]);
  const [switching, setSwitching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch workspaces on mount
  useEffect(() => {
    if (!session) return;
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/workspaces`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (json.success) {
          setWorkspaces(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
      }
    };
    fetchWorkspaces();
  }, [session]);

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
    if (targetId === userData?.tenant_id) {
      setDropdownOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ target_tenant_id: targetId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      
      // Hard reload to clear query cache
      window.location.href = '/';
    } catch (err) {
      addToast('error', 'Workspace Switch Failed', err.message);
      setSwitching(false);
    }
  };
  
  const currentWorkspace = workspaces.find(w => w.tenant_id === userData?.tenant_id);
  const tenantName = currentWorkspace?.name || "Loading..."; 
  const tenantSubtitle = currentWorkspace?.role === 'admin' ? "Business Admin" : "Employee";

  return (
    <div className="antialiased min-h-screen flex font-body-md text-body-md text-on-surface bg-background">
      {/* SideNavBar */}
      <nav className="hidden md:flex bg-[#1F2937] text-white font-body-md text-body-md docked left-0 h-full w-[280px] border-r border-[#374151] flat no shadows fixed top-0 flex-col p-4 z-40">
        <div className="mb-8 px-2 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center font-headline-md font-bold text-black shrink-0">P</div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white leading-tight">{tenantName}</h1>
              <span className="font-label-caps text-label-caps text-gray-400">{tenantSubtitle}</span>
            </div>
          </div>
        </div>
        
        <ul className="flex-1 space-y-[8px]">
          <li>
            <NavLink to="/" className={({ isActive }) => `relative group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                  <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>dashboard</span>
                  <span className={`font-body-md ${isActive ? 'font-bold' : 'font-medium'}`}>Dashboard</span>
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink to="/clients" className={({ isActive }) => `relative group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                  <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>group</span>
                  <span className={`font-body-md ${isActive ? 'font-bold' : 'font-medium'}`}>Clients</span>
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink to="/jobs" className={({ isActive }) => `relative group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                  <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>work</span>
                  <span className={`font-body-md ${isActive ? 'font-bold' : 'font-medium'}`}>Jobs</span>
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink to="/invoices" className={({ isActive }) => `relative group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                  <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>receipt_long</span>
                  <span className={`font-body-md ${isActive ? 'font-bold' : 'font-medium'}`}>Invoices</span>
                </>
              )}
            </NavLink>
          </li>
        </ul>
        
        <ul className="mt-auto pt-4 border-t border-gray-700 space-y-2 mb-4">
          <li>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 rounded-lg group">
              <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors">settings</span>
              <span className="font-body-md font-medium">Settings</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 rounded-lg group">
              <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors">help</span>
              <span className="font-body-md font-medium">Support</span>
            </a>
          </li>
        </ul>
        
        <button 
          onClick={() => navigate('/jobs?add=true')}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 text-black py-2.5 rounded font-body-md font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-black" style={{ fontSize: '18px' }}>add</span>
          Add Job
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col h-screen bg-[#F9FAFB] relative overflow-hidden">
        
        {/* TopAppBar */}
        <header className="bg-white border-b border-gray-200 flex justify-between items-center px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            {/* Workspace Switcher */}
            <div 
              className={`flex items-center gap-2 cursor-pointer p-2 -ml-2 rounded-lg transition-colors ${workspaces.length > 1 ? 'hover:bg-gray-100' : ''}`}
              onClick={() => workspaces.length > 1 && setDropdownOpen(!dropdownOpen)}
            >
              <h2 className="font-headline-md text-headline-md font-bold text-gray-900">{tenantName}</h2>
              {workspaces.length > 1 && (
                <span className={`material-symbols-outlined text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              )}
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && workspaces.length > 1 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Workspace</span>
                </div>
                {workspaces.map(ws => (
                  <button
                    key={ws.tenant_id}
                    onClick={() => handleSwitchWorkspace(ws.tenant_id)}
                    disabled={switching}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${ws.tenant_id === userData?.tenant_id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${ws.tenant_id === userData?.tenant_id ? 'font-bold text-primary' : ''}`}>{ws.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{ws.role}</span>
                    </div>
                    {ws.tenant_id === userData?.tenant_id && (
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-2">
                  <button 
                    onClick={() => navigate('/onboarding')}
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
            <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <span className="material-symbols-outlined">settings</span>
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
                  <div className="px-4 py-3 border-b border-gray-100 mb-2">
                    <p className="text-sm font-medium text-gray-900 truncate">Account</p>
                    <p className="text-xs text-gray-500 truncate" title={user?.email}>{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
                    My Profile
                  </button>
                  <button 
                    onClick={async () => {
                      const { useAuth } = await import('../../contexts/AuthContext');
                      // Note: Because signOut is not extracted at the top level for this scope directly to avoid circulars or double grabs,
                      // We can just rely on the component's existing scope! Wait, I didn't extract signOut.
                    }}
                    className="hidden" // Will fix below properly
                  />
                  {/* Real Sign Out Button */}
                  <div className="border-t border-gray-100 mt-2"></div>
                  <AuthContextLogoutButton />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-[1440px] mx-auto">
            {children || <Outlet />}
          </div>
        </div>
      </main>
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
