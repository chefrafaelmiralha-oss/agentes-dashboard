import React from 'react'

const LEGENDA = [
  { key: 'anotacao', label: 'Anotação', desc: 'Informação registrada do grupo', color: 'var(--blue)' },
  { key: 'status',   label: 'Status',   desc: 'Atualização de status do mentorado', color: 'var(--accent)' },
  { key: 'alerta',   label: 'Alerta',   desc: 'Situação crítica detectada', color: 'var(--red)' },
  { key: 'disparo',  label: 'Disparo',  desc: 'Mensagem enviada pelo agente', color: 'var(--green)' },
]

export default function StatsCards({ logs, mentorados }) {
  const today = new Date().toDateString()
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today)
  const alertasHoje = todayLogs.filter(l => l.tipo === 'alerta').length
  const ultimoLog = logs[0]

  function formatTime(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    const diff = Math.floor((Date.now() - d) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
    return d.toLocaleDateString('pt-BR')
  }

  const cards = [
    { label: 'Mentorados ativos', value: mentorados.length, color: 'var(--green)', sub: 'com agente ativo' },
    { label: 'Registros hoje', value: todayLogs.length, color: 'var(--accent)', sub: `${logs.length} nos últimos 300` },
    { label: 'Alertas hoje', value: alertasHoje, color: alertasHoje > 0 ? 'var(--red)' : 'var(--muted)', sub: 'situações críticas' },
    { label: 'Último registro', value: ultimoLog?.restaurante?.split(' ')[0] || '—', color: 'var(--blue)', sub: formatTime(ultimoLog?.created_at) },
  ]

  return (
    <div>
      <div style={s.grid}>
        {cards.map(c => (
          <div key={c.label} style={s.card}>
            <div style={{ ...s.value, color: c.color, fontSize: c.label === 'Último registro' ? 22 : 34 }}>{c.value}</div>
            <div style={s.label}>{c.label}</div>
            <div style={s.sub}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={s.legend}>
        <span style={s.legendTitle}>Tipos de registro:</span>
        {LEGENDA.map(item => (
          <span key={item.key} style={s.legendItem}>
            <span style={{ ...s.legendDot, background: item.color }} />
            <strong style={{ color: item.color }}>{item.label}</strong>
            <span style={s.legendDesc}> — {item.desc}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' },
  value: { fontSize: 34, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  label: { fontSize: 13, fontWeight: 600, marginTop: 8, color: 'var(--text)' },
  sub: { fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  legend: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' },
  legendTitle: { fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  legendDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  legendDesc: { color: 'var(--muted)' },
}
