import { NavLink } from 'react-router-dom'

const linkStyle = ({ isActive }) => ({
  padding: '8px 10px',
  borderRadius: 6,
  textDecoration: 'none',
  color: isActive ? '#fff' : '#123',
  background: isActive ? '#1a73e8' : 'transparent',
})

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 220,
        background: '#e6f0ff',
        padding: 20,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ marginBottom: 20, color: '#1a3f8b' }}>MedIntelli Basic</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <NavLink to="/" style={linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/pacientes" style={linkStyle}>
          Pacientes
        </NavLink>
        <NavLink to="/agenda" style={linkStyle}>
          Agenda
        </NavLink>
        <NavLink to="/lista-espera" style={linkStyle}>
          Lista de Espera
        </NavLink>
        <NavLink to="/prontuario" style={linkStyle}>
          Prontuário
        </NavLink>
        <NavLink to="/chat-ia" style={linkStyle}>
          Chat IA
        </NavLink>
        <NavLink to="/config" style={linkStyle}>
          Configurações
        </NavLink>
      </nav>
    </aside>
  )
}
