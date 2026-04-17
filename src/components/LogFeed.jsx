import React, { useState } from 'react'

const TIPO_STYLE = {
  anotacao: { bg: 'var(--blue-dim)', color: 'var(--blue)', label: 'anotação' },
  status:   { bg: 'var(--accent-dim)', color: 'var(--accent)', label: 'status' },
  alerta:   { bg: 'var(--yellow-dim)', color: 'var(--yellow)', label: 'alerta' },
  ignorar:  { bg: '#ffffff08', color: 'var(--muted)', label: 'ignorar' },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function LogFeed({ logs, loading }) {
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')

  const tipos = ['todos', 'anotacao', 'status', 'alerta', 'ignorar']

  const filtered = logs.filter(l => {
    if (filter !== 'todos' && l.tipo !== filter) return false
    if (search && !l.restaurante?.toLowerCase().includes(search.toLowerCase()) &&
        !l.descricao?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          Feed de logs
          {loading && <span style={styles.pulse}>●</span>}
        </div>
        <div style={styles.controls}>
          <input
            placeholder="Buscar restaurante ou descrição…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.input}
          />
          <div style={styles.tabs}>
            {tipos.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{ ...styles.tab, ...(filter === t ? styles.tabActive : {}) }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.feed}>
        {filtered.length === 0 && (
          <div style={styles.empty}>Nenhum log encontrado.</div>
        )}
        {filtered.map(log => {
          const tipo = TIPO_STYLE[log.tipo] || TIPO_STYLE.ignorar
          return (
            <div key={log.id} style={styles.row}>
              <div style={{ ...styles.tipoBadge, background: tipo.bg, color: tipo.color }}>
                {tipo.label}
              </div>
              <div style={styles.rowContent}>
                <div style={styles.restaurante}>{log.restaurante || '—'}</div>
                <div style={styles.descricao}>{log.descricao || '—'}</div>
              </div>
              <div style={styles.time}>{timeAgo(log.created_at)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  header: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 },
  title: { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 },
  pulse: { color: 'var(--green)', fontSize: 10, animation: 'pulse 1.5s infinite' },
  controls: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', width: 260 },
  tabs: { display: 'flex', gap: 4 },
  tab: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  tabActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  feed: { maxHeight: 520, overflowY: 'auto' },
  empty: { padding: 40, textAlign: 'center', color: 'var(--muted)' },
  row: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
  tipoBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, flexShrink: 0, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' },
  rowContent: { flex: 1, minWidth: 0 },
  restaurante: { fontWeight: 600, fontSize: 13, marginBottom: 2 },
  descricao: { color: 'var(--muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  time: { color: 'var(--muted)', fontSize: 12, flexShrink: 0, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' },
}
