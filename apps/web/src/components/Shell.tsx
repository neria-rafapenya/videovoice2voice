import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="topbar-kicker">videovoice2voice</p>
          <h1>Dashboard de voz a voz</h1>
        </div>

        <div className="topbar-actions">
          <nav className="nav-tabs" aria-label="Primary">
            <NavLink to="/home" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Home
            </NavLink>
          </nav>
          <span className="user-chip">{user?.email}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
