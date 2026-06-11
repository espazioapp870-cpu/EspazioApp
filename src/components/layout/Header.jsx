// src/components/layout/Header.jsx
import { useAuth } from '../../store/AuthContext';

const RoleIcon = ({ role }) => {
  if (role === 'administrator') return <span>🔒</span>;
  if (role === 'editor') return <span>✏️</span>;
  return <span>👁️</span>;
};

const roleLabel = { administrator: 'Admin', editor: 'Editor', viewer: 'Visualizador' };

export default function Header() {
  const { profile, signOut, centers, activeCenter, setActiveCenter } = useAuth();

  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="/logo.png" alt="ESPAZIO" className="header-logo" />
        <div className="header-info">
          <span className="header-appname">ESPAZIO</span>
          <span className="header-user">
            {profile?.name}
            {profile?.role && (
              <span className="header-role-badge">
                <RoleIcon role={profile.role} /> {roleLabel[profile.role]}
              </span>
            )}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
        {profile?.is_superadmin ? (
          centers && centers.length > 0 && (
            <select 
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
              value={activeCenter?.id || ''}
              onChange={(e) => setActiveCenter(centers.find(c => c.id === e.target.value))}
              title="Selecionar Centro"
            >
              {centers.map(c => <option key={c.id} value={c.id}>📍 {c.name}</option>)}
            </select>
          )
        ) : (
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>
            📍 {activeCenter?.name || 'Centro'}
          </div>
        )}
        <button className="header-logout" onClick={signOut} title="Sair" style={{ marginLeft: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
