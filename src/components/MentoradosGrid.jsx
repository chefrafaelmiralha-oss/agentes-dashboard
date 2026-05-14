import React, { useState } from 'react'

const SAUDE_COLOR = { 'Adiplente': 'var(--green)', 'Inadiplente': 'var(--red)' }
const TUTORIA_COLOR = { 'Sim': 'var(--green)', 'Não': 'var(--yellow)' }
const PAGAMENTO_COLOR = { 'Concluido': 'var(--green)', 'Pendente': 'var(--yellow)' }

function Badge({ value, colorMap }) {
  if (!value) return null
  const color = colorMap[value] || 'var(--muted)'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {value}
    </span>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function MentoradosGrid({ mentorados, logs, loading, onSelect }) {
  const [search, setSearch] = useState('')
  const [filterInadimplente, setFilterInadimplente] = useState(false)

  if (loading) return <div style={s.loading}>Carregando mentorados…</div>

  const logsByRestaurante = logs.reduce((acc, l) => {
    if (!l.restaurante) return acc
    if (!acc[l.restaurante]) acc[l.restaurante] = []
    acc[l.restaurante].push(l)
    return acc
  }, {})

  const filtered = mentorados.filter(m => {
    if (filterInadimplente && m.saude_financeira !== 'Inadiplente') return false
    if (search) {
      const q = search.toLowerCase()
      if (!m.nome.toLowerCase().includes(q) && !m.tutor?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <div style={s.controls}>
        <input
          placeholder="Buscar restaurante ou tutor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={s.input}
        />
        <button
          onClick={() => setFilterInadimplente(v => !v)}
          style={{ ...s.filterBtn, ...(filterInadimplente ? s.filterActive : {}) }}
        >
          ⚠ Inadimplentes
        </button>
        <span style={s.counter}>{filtered.length} de {mentorados.length} mentorados</span>
      </div>

      <div style={s.grid}>
        {filtered.map(m => {
          const mLogs = logsByRestaurante[m.nome] || []
          const lastLog = mLogs[0]
          const hasAlerta = mLogs.some(l => l.tipo === 'alerta')
          const temAtividade = mLogs.length > 0

          return (
            <div
              key={m.id}
              style={{ ...s.card, ...(hasAlerta ? s.cardAlerta : !temAtividade ? s.cardInativo : {}) }}
              onClick={() => onSelect(m)}
            >
              <div style={s.cardTop}>
                <div style={{ ...s.avatar, background: hasAlerta ? 'var(--red-dim)' : 'var(--accent-dim)', color: hasAlerta ? 'var(--red)' : 'var(--accent)' }}>
                  {m.nome[0]}
                </div>
                <div style={s.cardMeta}>
                  <div style={s.nome}>{m.nome}</div>
                  <div style={s.tutor}>{m.tutor || '—'}</div>
                </div>
                {lastLog && <div style={s.ago}>{timeAgo(lastLog.created_at)}</div>}
              </div>

              <div style={s.badges}>
                <Badge value={m.saude_financeira} colorMap={SAUDE_COLOR} />
                <Badge value={m.ativo_tutorias} colorMap={TUTORIA_COLOR} />
                <Badge value={m.pagamento} colorMap={PAGAMENTO_COLOR} />
              </div>

              {lastLog ? (
                <div style={s.lastLog}>{lastLog.descricao || '—'}</div>
              ) : (
                <div style={{ ...s.lastLog, color: 'var(--muted)', fontStyle: 'italic' }}>Sem atividade registrada</div>
              )}

              <div style={s.logCount}>{mLogs.length} registros</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  loading: { textAlign: 'center', color: 'var(--muted)', padding: 80 },
  controls: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  input: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', width: 280 },
  filterBtn: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  filterActive: { background: 'var(--red-dim)', borderColor: 'var(--red)', color: 'var(--red)' },
  counter: { color: 'var(--muted)', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s' },
  cardAlerta: { borderColor: '#ef444440' },
  cardInativo: { opacity: 0.6 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 },
  cardMeta: { flex: 1, minWidth: 0 },
  nome: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tutor: { fontSize: 11, color: 'var(--muted)', marginTop: 1 },
  ago: { fontSize: 11, color: 'var(--muted)', flexShrink: 0 },
  badges: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  lastLog: { fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderTop: '1px solid var(--border)', paddingTop: 8 },
  logCount: { fontSize: 11, color: 'var(--muted)' },
}
