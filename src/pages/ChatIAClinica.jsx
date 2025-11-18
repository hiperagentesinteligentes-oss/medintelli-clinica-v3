import { useState } from 'react'
import { clinicKnowledgeBase } from '../knowledgeBaseClinic'

export default function ChatIAClinica() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o assistente da clínica MedIntelli. Como posso ajudar hoje?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        setError('VITE_OPENAI_API_KEY não configurado no Vercel.')
        setLoading(false)
        return
      }

      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: clinicKnowledgeBase },
          ...newMessages.map(m => ({ role: m.role, content: m.content })),
        ],
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        throw new Error('Erro ao chamar OpenAI: ' + resp.status)
      }

      const data = await resp.json()
      const answer = data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta agora.'

      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
      console.error(err)
      setError('Erro ao conversar com a IA. Verifique a chave de API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Chat IA - Clínica</h2>
      <p style={{ fontSize: 14, color: '#555' }}>
        As respostas são automáticas e baseadas na OpenAI + base de conhecimento configurada no código.
      </p>

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 16,
          height: 400,
          overflowY: 'auto',
          marginBottom: 12,
          background: '#fafafa',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              textAlign: m.role === 'user' ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: 12,
                background: m.role === 'user' ? '#1a73e8' : '#e0e0e0',
                color: m.role === 'user' ? '#fff' : '#000',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p>IA está respondendo...</p>}
      </div>

      {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#1a73e8',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
