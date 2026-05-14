import React, { useState } from 'react'

const TIPO_STYLE = {
  anotacao: { bg: 'var(--blue-dim)',   color: 'var(--blue)',   label: 'Anotação' },
  status:   { bg: 'var(--accent-dim)', color: 'var(--accent)', label: 'Status'   },
  alerta:   { bg: 'var(--red-dim)',    color: 'var(--red)',    label: 'Alerta'   },
  disparo:  { bg: 'var(--green-dim)',  color: 'var(--green)',  label: 'Disparo'  },
  ignorar:  { bg: '#ffffff08',         color: 'var(--muted)',  label: 'Ignorar'  },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function inRange(dateStr, range) {
  if (range === 'tudo') return true
  const diff = Date.now() - new Date(dateStr)
  if (range === 'hoje') return new Date(dateStr).toDateString() === new Date().toDateString()
  if (range === 'semana') return diff < 7 * 86400000
  return true
}

const TIPOS = ['todos', 'anotacao', 'status', 'alerta', 'disparo']
const RANGES = [
  { id: 'hoje',  label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'tudo',  label: 'Tudo' },
]

export default function LogFeed({ logs, loading }) {
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [range, setRange] = useState('hoje')
  const [search, setSearch] = useState('')

  const filtered = logs.filter(l => {
    if (tipoFilter !== 'todos' && l.tipo !== tipoFilter) return false
    if (!inRange(l.created_at, range)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.restaurante?.toLowerCase().includes(q) && !l.descricao?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>
          Feed de atividade
          {loading && <span style={s.pulse}>●</span>}
          <span style={s.count}>{filtered.length}</span>
        </div>
        <div style={s.controls}>
          <input
            placeholder="Buscar restaurante ou descrição…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.input}
          />
          <div style={s.group}>
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                style={{ ...s.tab, ...(range === r.id ? s.tabActive : {}) }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div style={s.group}>
            {TIPOS.map(t => {
              const ts = TIPO_STYLE[t]
              const isActive = tipoFilter === t
              return (
                <button
                  key={t}
                  onClick={() => setTipoFilter(t)}
                  style={{
                    ...s.tab,
                    ...(isActive && ts ? { background: ts.bg, borderColor: ts.color, color: ts.color } : {}),
                    ...(isActive && t === 'todos' ? s.tabActive : {}),
                  }}
                >
                  {t === 'todos' ? 'Todos' : (ts?.label || t)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={s.feed}>
        {filtered.length === 0 && (
          <div style={s.empty}>Nenhum registro encontrado.</div>
        )}
        {filtered.map(log => {
          const tipo = TIPO_STYLE[log.tipo] || { bg: '#ffffff08', color: 'var(--muted)', label: log.tipo }
          return (
            <div key={log.id} style={s.row}>
              <div style={{ ...s.badge, background: tipo.bg, color: tipo.color }}>{tipo.label}</div>
              <div style={s.rowContent}>
                <div style={s.restaurante}>{log.restaurante || '—'}</div>
                <div style={s.descricao}>{log.descricao || '—'}</div>
              </div>
              <div style={s.time}>{timeAgo(log.created_at)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  container: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  header: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 },
  title: { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 },
  pulse: { color: 'var(--green)', fontSize: 10 },
  count: { background: 'var(--surface2)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 },
  controls: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', width: 240 },
  group: { display: 'flex', gap: 4 },
  tab: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' },
  tabActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  feed: { maxHeight: 560, overflowY: 'auto' },
  empty: { padding: 48, textAlign: 'center', color: 'var(--muted)' },
  row: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--border)' },
  badge: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, flexShrink: 0, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' },
  rowContent: { flex: 1, minWidth: 0 },
  restaurante: { fontWeight: 600, fontSize: 13, marginBottom: 2 },
  descricao: { color: 'var(--muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  time: { color: 'var(--muted)', fontSize: 12, flexShrink: 0, marginTop: 2 },
}
