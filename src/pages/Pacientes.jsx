import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Pacientes() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    birth_date: '',
    notes: '',
  })
  const [error, setError] = useState('')

  async function loadPatients() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setError('Erro ao carregar pacientes.')
    } else {
      setPatients(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPatients()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    setError('')

    const { error } = await supabase.from('patients').insert({
      name: form.name,
      phone: form.phone,
      birth_date: form.birth_date || null,
      notes: form.notes,
    })

    if (error) {
      console.error(error)
      setError('Erro ao salvar paciente.')
    } else {
      setForm({ name: '', phone: '', birth_date: '', notes: '' })
      loadPatients()
    }

    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Deseja realmente excluir este paciente?')) return
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Erro ao excluir.')
    } else {
      setPatients(prev => prev.filter(p => p.id !== id))
    }
  }

  return (
    <div>
      <h1>Pacientes</h1>

      <h3>Novo paciente</h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nome *"
          required
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Telefone"
        />
        <input
          type="date"
          name="birth_date"
          value={form.birth_date}
          onChange={handleChange}
          placeholder="Data de nascimento"
        />
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações"
          rows={3}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: '#1a73e8',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar paciente'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}

      <hr style={{ margin: '16px 0' }} />

      <h3>Lista de pacientes</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : patients.length === 0 ? (
        <p>Nenhum paciente cadastrado.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#e6f0ff' }}>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Nascimento</th>
              <th>Obs.</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.birth_date || '-'}</td>
                <td>{p.notes}</td>
                <td>
                  <button onClick={() => handleDelete(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

