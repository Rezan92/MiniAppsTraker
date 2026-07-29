import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  
  // Placeholder tenant data
  const tenantName = "ProFix Solutions"; 
  const tenantSubtitle = "Independent Contractor";

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
        
        <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 text-black py-2.5 rounded font-body-md font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 duration-150">
          <span className="material-symbols-outlined text-black" style={{ fontSize: '18px' }}>add</span>
          Create New Job
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col h-screen bg-[#F9FAFB]">
        {/* TopAppBar */}
        <header className="bg-white border-b border-gray-200 flex justify-between items-center px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="font-headline-md text-headline-md font-bold text-gray-900">ProFix</h2>
          </div>
          
          <div className="flex justify-end items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:border-primary transition-colors bg-gray-100 flex items-center justify-center">
               <span className="material-symbols-outlined text-gray-500">person</span>
            </button>
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
