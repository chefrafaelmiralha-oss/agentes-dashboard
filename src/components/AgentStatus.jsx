import React, { useEffect, useState } from 'react'

const HEALTH_URL = import.meta.env.VITE_AGENT_HEALTH_URL

export default function AgentStatus() {
  const [status, setStatus] = useState('checking') // checking | online | offline
  const [lastCheck, setLastCheck] = useState(null)

  const check = async () => {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) })
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
  }, [])

  const dot = {
    online: { color: 'var(--green)', label: 'Online' },
    offline: { color: 'var(--red)', label: 'Offline' },
    checking: { color: 'var(--yellow)', label: 'Verificando…' },
  }[status]

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <span style={{ ...styles.dot, background: dot.color, boxShadow: `0 0 8px ${dot.color}` }} />
        <span style={styles.label}>Agente GL</span>
        <span style={{ ...styles.badge, color: dot.color }}>{dot.label}</span>
      </div>
      {lastCheck && (
        <div style={styles.meta}>
          Último check: {lastCheck.toLocaleTimeString('pt-BR')}
        </div>
      )}
      <div style={styles.meta}>
        <a href={HEALTH_URL?.replace('/health', '')} target="_blank" rel="noreferrer" style={styles.link}>
          agentes-gl-production.up.railway.app
        </a>
      </div>
    </div>
  )
}

const styles = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  label: { fontWeight: 600, fontSize: 15 },
  badge: { marginLeft: 'auto', fontSize: 12, fontWeight: 600 },
  meta: { color: 'var(--muted)', fontSize: 12 },
  link: { color: 'var(--accent)', textDecoration: 'none' },
}
