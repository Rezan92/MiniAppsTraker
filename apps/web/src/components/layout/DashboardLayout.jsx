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
      <nav className="hidden md:flex bg-surface dark:bg-inverse-surface text-primary dark:text-primary-fixed-dim font-body-md text-body-md docked left-0 h-full w-64 border-r border-outline-variant dark:border-outline flat no shadows fixed top-0 flex-col p-4 z-40">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0">
            <img alt="Contractor Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKchZKHbJQmqwJmpq9tXOHcbD672jNUerLBB1Jb-TWpe8BWSYYsIFM_nFJEna4RM1sESlknjxHBNnjjQl2PC4W3GuqbetJF7OZL7OggAupsoiLKa2HaGk26GNFR1xRf8drenxSThqRgh22FjbqmOykdbPVejyrLWuj3RYOSSUYIAP_ViRUeU9hAG587-aSm8a50cO9RXOV1vG50M4FgTH4XZcxmWrKeGlghU9kdhnIPg8RP5bHGxwfsg" />
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary">{tenantName}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">{tenantSubtitle}</p>
          </div>
        </div>
        
        <ul className="flex-1 space-y-2">
          <li>
            <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary-fixed-dim font-bold bg-surface-container-high dark:bg-surface-variant' : 'text-on-surface-variant dark:text-on-tertiary-container hover:bg-surface-container-low dark:hover:bg-tertiary-container'}`}>
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/clients" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary-fixed-dim font-bold bg-surface-container-high dark:bg-surface-variant' : 'text-on-surface-variant dark:text-on-tertiary-container hover:bg-surface-container-low dark:hover:bg-tertiary-container'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              Clients
            </NavLink>
          </li>
          <li>
            <NavLink to="/jobs" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary-fixed-dim font-bold bg-surface-container-high dark:bg-surface-variant' : 'text-on-surface-variant dark:text-on-tertiary-container hover:bg-surface-container-low dark:hover:bg-tertiary-container'}`}>
              <span className="material-symbols-outlined">handyman</span>
              Jobs
            </NavLink>
          </li>
          <li>
            <NavLink to="/invoices" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary-fixed-dim font-bold bg-surface-container-high dark:bg-surface-variant' : 'text-on-surface-variant dark:text-on-tertiary-container hover:bg-surface-container-low dark:hover:bg-tertiary-container'}`}>
              <span className="material-symbols-outlined">receipt_long</span>
              Invoices
            </NavLink>
          </li>
        </ul>
        
        <ul className="mt-auto pt-4 border-t border-outline-variant space-y-2 mb-4">
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant dark:text-on-tertiary-container hover:bg-surface-container-low dark:hover:bg-tertiary-container transition-colors duration-200 rounded-lg">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant dark:text-on-tertiary-container hover:bg-surface-container-low dark:hover:bg-tertiary-container transition-colors duration-200 rounded-lg">
              <span className="material-symbols-outlined">help_outline</span>
              Support
            </a>
          </li>
        </ul>
        
        <button className="w-full bg-secondary-container text-on-secondary-container font-title-md text-title-md py-3 rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          New Job
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* TopAppBar */}
        <header className="bg-surface-bright dark:bg-surface-dim text-primary dark:text-primary-fixed-dim font-title-md text-title-md border-b border-outline-variant dark:border-outline flex justify-between items-center h-16 px-6 fixed top-0 left-0 right-0 z-30 md:ml-64 md:w-[calc(100%-16rem)]">
          <div className="flex items-center gap-4">
            <h2 className="font-headline-md text-headline-md font-bold text-primary dark:text-on-surface">{tenantName}</h2>
          </div>
          
          <div className="flex justify-end items-center gap-4">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant hover:border-primary transition-colors">
              <img alt="User Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXNx85d1Uz6rP2peIVLRRFAZqiC28-cMpD4xyGchsQd08Bhm4kw2-JvUBoA5v-rZT5VPq-Wv1WMuPJFwP8mYx6RvlufA9zYSAdrjdNP73Jtak-BOUptH-TMG25X7sqVJFFn3ZvSFHTItc_g9S2ZoKulyY14oNfhOcDqrEdc-EQYDAFVgzZ02FPh0nBXNoQkc5O3SyC29YnXgWznJ0ThdoTsffoJAfDq7JvsytfoYAAfTFAoTr9BUq_CQ" />
            </button>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 p-6 md:p-gutter mt-16 max-w-container-max mx-auto w-full">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
