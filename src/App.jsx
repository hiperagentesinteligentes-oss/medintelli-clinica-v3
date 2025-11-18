import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Agenda from './pages/Agenda'
import ListaEspera from './pages/ListaEspera'
import Prontuario from './pages/Prontuario'
import Config from './pages/Config'
import ChatIAClinica from './pages/ChatIAClinica'

export default function App() {
  return (
    <div style={{ display: 'flex', fontFamily: 'sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 20 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/lista-espera" element={<ListaEspera />} />
          <Route path="/prontuario" element={<Prontuario />} />
          <Route path="/config" element={<Config />} />
          <Route path="/chat-ia" element={<ChatIAClinica />} />
        </Routes>
      </main>
    </div>
  )
}
