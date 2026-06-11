// src/components/layout/BottomNav.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const OutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="8,12 12,8 16,12"/><line x1="12" y1="16" x2="12" y2="8"/>
  </svg>
);
const InIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="8,12 12,16 16,12"/><line x1="12" y1="8" x2="12" y2="16"/>
  </svg>
);
const BoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="12,8 12,12 14,14"/>
    <path d="M3.05 11a9 9 0 1 0 .5-3"/>
    <polyline points="3,3 3,11 11,11"/>
  </svg>
);
const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const navClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={navClass}>
        <HomeIcon /><span>Início</span>
      </NavLink>
      <NavLink to="/saida" className={navClass}>
        <OutIcon /><span>Saída</span>
      </NavLink>
      <NavLink to="/entrada" className={navClass}>
        <InIcon /><span>Entrada</span>
      </NavLink>
      <NavLink to="/produtos" className={navClass}>
        <BoxIcon /><span>Produtos</span>
      </NavLink>
      <NavLink to="/relatorios" className={navClass}>
        <ReportIcon /><span>Relatórios</span>
      </NavLink>
      <NavLink to="/historico" className={navClass}>
        <HistoryIcon /><span>Histórico</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={navClass}>
          <AdminIcon /><span>Admin</span>
        </NavLink>
      )}
    </nav>
  );
}
