import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Agenda() {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    patient_id: '',
    date: '',
    time: '',
    reason: '',
  })

  async function loadData() {
    setLoading(true)

    const [{ data: pats }, { data: apps }] = await Promise.all([
      supabase.from('patients').select('id,name').order('name'),
      supabase
        .from('appointments')
        .select('id,start_time,status,reason,patients(name)')
        .order('start_time', { ascending: true }),
    ])

    setPatients(pats || [])
    setAppointments(apps || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.patient_id || !form.date || !form.time) return

    const start = new Date(`${form.date}T${form.time}:00`)

    const { error } = await supabase.from('appointments').insert({
      patient_id: form.patient_id,
      start_time: start.toISOString(),
      reason: form.reason,
      status: 'agendado',
    })

    if (error) {
      console.error(error)
      alert('Erro ao agendar.')
    } else {
      setForm({ patient_id: '', date: '', time: '', reason: '' })
      loadData()
    }
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Erro ao atualizar status.')
    } else {
      loadData()
    }
  }

  return (
    <div>
      <h1>Agenda</h1>

      <h3>Novo agendamento</h3>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'grid', gap: 8, maxWidth: 500, marginBottom: 16 }}
      >
        <select
          name="patient_id"
          value={form.patient_id}
          onChange={handleChange}
          required
        >
          <option value="">Selecione o paciente</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
          />
        </div>

        <input
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Motivo / Observações"
        />

        <button
          type="submit"
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: '#1a73e8',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Agendar
        </button>
      </form>

      <h3>Consultas agendadas</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : appointments.length === 0 ? (
        <p>Sem consultas agendadas.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#e6f0ff' }}>
            <tr>
              <th>Paciente</th>
              <th>Data/Hora</th>
              <th>Status</th>
              <th>Motivo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(a => (
              <tr key={a.id}>
                <td>{a.patients?.name || '-'}</td>
                <td>{new Date(a.start_time).toLocaleString('pt-BR')}</td>
                <td>{a.status}</td>
                <td>{a.reason}</td>
                <td>
                  <button onClick={() => updateStatus(a.id, 'confirmado')}>Confirmar</button>{' '}
                  <button onClick={() => updateStatus(a.id, 'cancelado')}>Cancelar</button>{' '}
                  <button onClick={() => updateStatus(a.id, 'concluido')}>Concluído</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
