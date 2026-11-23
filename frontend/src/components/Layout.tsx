
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Tags,
  UserCheck,
  UserCog,
  Users,
  Wrench,
  AlertOctagon,
  IdCard,
  X,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const main = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/adherents', label: 'Adhérents', icon: Users },
  { to: '/abonnements', label: 'Abonnements', icon: IdCard },
  { to: '/paiements', label: 'Paiements', icon: CreditCard },
];

const extra = [
  { to: '/offres', label: "Types d'abonnement", icon: Tags },
  { to: '/cours', label: 'Cours collectifs', icon: CalendarDays },
  { to: '/presences', label: 'Présences', icon: UserCheck },
  { to: '/machines', label: 'Machines', icon: Dumbbell },
  { to: '/pannes', label: 'Pannes', icon: AlertOctagon },
  { to: '/maintenances', label: 'Maintenances', icon: Wrench },
  { to: '/personnel', label: 'Personnel & coachs', icon: UserCog },
];

type ItemProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  onClick: () => void;
  collapsed?: boolean;
};

function Item({
  to,
  label,
  icon: Icon,
  end,
  onClick,
  collapsed = false,
}: ItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `gm-nav-item ${isActive ? 'gm-nav-active' : ''} ${
          collapsed
            ? '!justify-center !gap-0 !px-2'
            : ''
        }`
      }
    >
      <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.9} />

      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          <ChevronRight className="gm-nav-arrow h-4 w-4" />
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  // Desktop sidebar
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="gm-layout min-h-screen lg:flex">

      {/* MOBILE HEADER */}
      <header className="gm-mobile-header lg:hidden">
        <div className="flex items-center gap-3">
          <div className="gm-logo-icon">
            <Dumbbell className="h-5 w-5" />
          </div>

          <span className="text-lg font-extrabold tracking-tight text-white">
            Gym<span className="text-red-500">Manager</span>
          </span>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="gm-menu-button"
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
  className={`
    gm-sidebar fixed inset-y-0 left-0 z-50
    flex flex-col transition-all duration-300 ease-in-out
    lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    ${sidebarExpanded ? 'lg:!w-[280px] lg:!min-w-[280px]' : 'lg:!w-0 lg:!min-w-0 lg:!max-w-0 lg:!overflow-hidden lg:!border-0'}
    !w-[280px]
  `}
>

        {/* BRAND */}
        <div className={`gm-brand ${!sidebarExpanded ? 'lg:!justify-center lg:!px-0' : ''}`}>
          <div className="gm-logo-icon gm-logo-large shrink-0">
            <Dumbbell className="h-6 w-6" strokeWidth={2.4} />
          </div>

          <div className={!sidebarExpanded ? 'lg:hidden' : ''}>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Gym<span className="text-red-500">Manager</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-gray-500">
              Fitness Administration
            </p>
          </div>
        </div>

        {/* DESKTOP COLLAPSE BUTTON */}
        <div className="hidden px-4 pb-4 lg:block">
          <button
            type="button"
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            title={sidebarExpanded ? 'Réduire le menu' : 'Ouvrir le menu'}
            aria-label={sidebarExpanded ? 'Réduire le menu' : 'Ouvrir le menu'}
            className={`
              flex h-10 w-full items-center rounded-xl
              border border-white/10 bg-white/5 text-gray-300
              transition-all hover:border-red-500/40 hover:bg-red-500/10
              hover:text-red-400
              ${sidebarExpanded ? 'justify-between px-3' : 'justify-center'}
            `}
          >
            {sidebarExpanded && (
              <span className="text-xs font-semibold">Réduire le menu</span>
            )}
            {sidebarExpanded
              ? <PanelLeftClose size={19} />
              : <PanelLeftOpen size={19} />}
          </button>
        </div>

        {/* SYSTEM STATUS */}
        {sidebarExpanded && (
          <div className="gm-status">
            <span className="gm-status-dot" />
            <span>Administration active</span>
          </div>
        )}

        {/* NAVIGATION */}
        <nav
          aria-label="Navigation principale"
          className={`flex-1 space-y-7 overflow-y-auto ${
            !sidebarExpanded ? 'lg:space-y-0' : ''
          }`}
        >

          {/* MAIN MENU */}
          <div>
            {sidebarExpanded && (
              <p className="gm-section-title">MENU PRINCIPAL</p>
            )}

            <div className="space-y-1">
              {main
                .filter((item) => sidebarExpanded || item.to === '/')
                .map((item) => (
                  <Item
                    key={item.to}
                    {...item}
                    onClick={closeMobile}
                    collapsed={!sidebarExpanded}
                  />
                ))}
            </div>
          </div>

          {/* EXTRA MENU */}
          {sidebarExpanded && (
            <div>
              <p className="gm-section-title flex items-center gap-2">
                <ClipboardList size={14} />
                GESTION DE LA SALLE
              </p>

              <div className="space-y-1">
                {extra.map((item) => (
                  <Item
                    key={item.to}
                    {...item}
                    onClick={closeMobile}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* USER PROFILE */}
        {sidebarExpanded && (
          <div className="gm-user-panel">
            <div className="flex items-center gap-3">
              <div className="gm-avatar">
                <ShieldCheck size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {user?.identifiant ?? 'Administrateur'}
                </p>
                <p className="text-xs text-red-400">
                  Administrateur
                </p>
              </div>
            </div>

            <button onClick={logout} className="gm-logout">
              <LogOut size={17} />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="gm-main min-w-0 flex-1">

        {/* TOP BAR */}
        <div className="gm-topbar hidden lg:flex">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              title={sidebarExpanded ? 'Réduire le menu' : 'Ouvrir le menu'}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            >
              {sidebarExpanded
                ? <PanelLeftClose size={20} />
                : <PanelLeftOpen size={20} />}
            </button>

            <div>
              <p className="text-sm font-bold text-white">
                Espace administration
              </p>
              <p className="text-xs text-gray-400">
                Gérez votre salle de sport en toute simplicité
              </p>
            </div>
          </div>

          <div className="gm-system-status">
            <span className="gm-status-dot" />
            <span className="text-xs font-semibold text-gray-300">
              Système opérationnel
            </span>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="gm-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
