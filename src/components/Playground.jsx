import React, { useState, useRef, useEffect } from 'react'

const TEST_TOKEN = import.meta.env.VITE_TEST_SECRET || ''

export default function Playground({ agent }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('ativo')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(`${agent.url}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Test-Token': TEST_TOKEN },
        body: JSON.stringify({ message: userMsg, mode }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const displayText = mode === 'passivo' && data.parsed
        ? JSON.stringify(data.parsed, null, 2)
        : data.response

      setMessages(prev => [...prev, { role: 'agent', text: displayText, mode, parsed: !!data.parsed }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', text: `Erro: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLabel}>Modo:</div>
        {['ativo', 'passivo'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{ ...styles.modeBtn, ...(mode === m ? styles.modeBtnActive : {}) }}
          >
            {m}
          </button>
        ))}
        <div style={styles.modeHint}>
          {mode === 'ativo'
            ? 'Simula comando direto de tutor autorizado → Claude responde em texto livre'
            : 'Simula mensagem de grupo → Claude retorna JSON de decisão'}
        </div>
        <button onClick={() => setMessages([])} style={styles.clearBtn}>Limpar</button>
      </div>

      <div style={styles.chat}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>Playground — {agent.name}</div>
            <div style={styles.emptyHint}>
              {mode === 'ativo'
                ? 'Ex: "qual o status dos mentorados com tarefas pendentes?"'
                : 'Ex: "batemos a meta de faturamento esse mês, CMV caiu para 28%"'}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.msg, ...(msg.role === 'user' ? styles.msgUser : msg.role === 'error' ? styles.msgError : styles.msgAgent) }}>
            <div style={styles.msgRole}>
              {msg.role === 'user' ? 'você' : msg.role === 'error' ? 'erro' : `${agent.name}${msg.parsed ? ' (JSON)' : ''}`}
            </div>
            <pre style={{ ...styles.msgText, ...(msg.parsed ? styles.msgCode : {}) }}>
              {msg.text}
            </pre>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.msg, ...styles.msgAgent }}>
            <div style={styles.msgRole}>{agent.name}</div>
            <div style={styles.typing}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={mode === 'ativo' ? 'Digite um comando…' : 'Simule uma mensagem do grupo…'}
          style={styles.input}
          rows={2}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={styles.sendBtn}>
          {loading ? '…' : '↑'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  toolbarLabel: { fontSize: 12, color: 'var(--muted)', fontWeight: 600 },
  modeBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  modeBtnActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  modeHint: { fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  clearBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginLeft: 'auto' },
  chat: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: 'var(--muted)' },
  emptyHint: { fontSize: 13, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' },
  msg: { display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end' },
  msgAgent: { alignSelf: 'flex-start' },
  msgError: { alignSelf: 'flex-start' },
  msgRole: { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 },
  msgText: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'Inter, sans-serif' },
  msgCode: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: '#0d1117', borderColor: '#30363d' },
  typing: { display: 'flex', gap: 4, padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 },
  inputRow: { display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' },
  input: { flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 },
  sendBtn: { width: 40, height: 40, borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' },
}
