import React, { useEffect, useState } from 'react'

export default function AgentStatus({ agent }) {
  const [status, setStatus] = useState('checking')
  const [lastCheck, setLastCheck] = useState(null)

  const check = async () => {
    if (!agent?.url) { setStatus('offline'); return }
    try {
      const res = await fetch(`${agent.url}/health`, { signal: AbortSignal.timeout(5000) })
      setStatus(res.ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
    setLastCheck(new Date())
  }

  useEffect(() => {
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [agent?.id])

  const dot = {
    online:   { color: 'var(--green)',  label: 'Online' },
    offline:  { color: 'var(--red)',    label: 'Offline' },
    checking: { color: 'var(--yellow)', label: 'Verificando…' },
  }[status]

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <span style={{ ...styles.dot, background: dot.color, boxShadow: `0 0 7px ${dot.color}` }} />
        <span style={{ ...styles.badge, color: dot.color }}>{dot.label}</span>
      </div>
      {lastCheck && (
        <div style={styles.meta}>Check: {lastCheck.toLocaleTimeString('pt-BR')}</div>
      )}
    </div>
  )
}

const styles = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  badge: { fontSize: 13, fontWeight: 600 },
  meta: { color: 'var(--muted)', fontSize: 11 },
}
