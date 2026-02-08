import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, PieChart, Wallet, FileUp } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  const isAddScreen = location.pathname === '/add' || location.pathname.startsWith('/edit') || location.pathname === '/setup';

  // Desktop Sidebar Link Component
  const SidebarLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-calm-blue/10 text-calm-blue font-medium' 
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        }`
      }
    >
      <Icon size={20} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-sans flex flex-col md:flex-row">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-neutral-200 h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-calm-blue text-white rounded-lg flex items-center justify-center">
                <Wallet size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-neutral-800">Spokój</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <SidebarLink to="/" icon={LayoutDashboard} label="Pulpit" />
            <SidebarLink to="/statistics" icon={PieChart} label="Statystyki" />
            
            <div className="pt-4 mt-4 border-t border-neutral-100 space-y-2">
                <NavLink
                    to="/add"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-calm-blue text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <PlusCircle size={20} />
                    <span className="font-medium">Dodaj Wydatek</span>
                </NavLink>
                <NavLink
                    to="/import"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                    <FileUp size={20} />
                    <span className="font-medium">Import z PDF</span>
                </NavLink>
            </div>
        </nav>

        <div className="p-6 text-xs text-neutral-400">
            &copy; 2024 Spokój App
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        <div className="md:max-w-7xl md:mx-auto w-full min-h-full flex flex-col">
            <Outlet />
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      {!isAddScreen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-calm-blue' : 'text-neutral-400 hover:text-neutral-600'
              }`
            }
          >
            <LayoutDashboard size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-medium tracking-wide">Pulpit</span>
          </NavLink>

          <NavLink
            to="/add"
            className="flex flex-col items-center justify-center -mt-8"
          >
            <div className="bg-calm-blue text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95">
              <PlusCircle size={32} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-medium text-neutral-500 mt-1">Wydatek</span>
          </NavLink>

          <NavLink
            to="/statistics"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-calm-blue' : 'text-neutral-400 hover:text-neutral-600'
              }`
            }
          >
            <PieChart size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-medium tracking-wide">Statystyki</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
};

export default Layout;