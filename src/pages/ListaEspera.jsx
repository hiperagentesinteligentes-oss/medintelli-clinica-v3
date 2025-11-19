import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ListaEspera() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    patient_name: '',
    phone: '',
    reason: '',
    priority: 1,
  })

  async function loadList() {
    setLoading(true)
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      alert('Erro ao carregar fila de espera.')
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadList()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.patient_name.trim()) return

    const { error } = await supabase.from('waitlist').insert({
      patient_name: form.patient_name,
      phone: form.phone,
      reason: form.reason,
      priority: Number(form.priority) || 1,
    })

    if (error) {
      console.error(error)
      alert('Erro ao adicionar na fila.')
    } else {
      setForm({ patient_name: '', phone: '', reason: '', priority: 1 })
      loadList()
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remover da fila?')) return
    const { error } = await supabase.from('waitlist').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Erro ao remover.')
    } else {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div>
      <h1>Lista de Espera</h1>

      <h3>Adicionar paciente à fila</h3>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'grid', gap: 8, maxWidth: 500, marginBottom: 16 }}
      >
        <input
          name="patient_name"
          value={form.patient_name}
          onChange={handleChange}
          placeholder="Nome do paciente *"
          required
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Telefone"
        />
        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Motivo / Observações"
          rows={2}
        />
        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
        >
          <option value={1}>Normal</option>
          <option value={2}>Prioridade</option>
        </select>

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
          Adicionar à fila
        </button>
      </form>

      <h3>Fila atual</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : items.length === 0 ? (
        <p>Fila vazia.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#e6f0ff' }}>
            <tr>
              <th>Paciente</th>
              <th>Telefone</th>
              <th>Motivo</th>
              <th>Prioridade</th>
              <th>Entrada</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td>{i.patient_name}</td>
                <td>{i.phone}</td>
                <td>{i.reason}</td>
                <td>{i.priority === 2 ? 'Prioridade' : 'Normal'}</td>
                <td>{new Date(i.created_at).toLocaleString('pt-BR')}</td>
                <td>
                  <button onClick={() => handleRemove(i.id)}>Atender / Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
