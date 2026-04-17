import React from 'react'

const TIPO_COLORS = {
  anotacao: 'var(--blue)',
  status: 'var(--accent)',
  alerta: 'var(--yellow)',
  ignorar: 'var(--muted)',
}

export default function StatsCards({ logs }) {
  const today = new Date().toDateString()
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today)

  const byTipo = logs.reduce((acc, l) => {
    acc[l.tipo] = (acc[l.tipo] || 0) + 1
    return acc
  }, {})

  const alertas = logs.filter(l => l.tipo === 'alerta').length
  const restaurantes = [...new Set(logs.map(l => l.restaurante))].length

  const cards = [
    { label: 'Total de logs', value: logs.length, color: 'var(--accent)', sub: `${todayLogs.length} hoje` },
    { label: 'Alertas', value: alertas, color: 'var(--yellow)', sub: 'tipo: alerta' },
    { label: 'Restaurantes ativos', value: restaurantes, color: 'var(--green)', sub: 'grupos monitorados' },
    { label: 'Hoje', value: todayLogs.length, color: 'var(--blue)', sub: new Date().toLocaleDateString('pt-BR') },
  ]

  return (
    <div style={styles.grid}>
      {cards.map(c => (
        <div key={c.label} style={styles.card}>
          <div style={{ ...styles.value, color: c.color }}>{c.value}</div>
          <div style={styles.label}>{c.label}</div>
          <div style={styles.sub}>{c.sub}</div>
        </div>
      ))}

      <div style={{ ...styles.card, gridColumn: 'span 4' }}>
        <div style={styles.tipoLabel}>Distribuição por tipo</div>
        <div style={styles.tipoRow}>
          {['anotacao', 'status', 'alerta', 'ignorar'].map(tipo => (
            <div key={tipo} style={styles.tipoItem}>
              <div style={{ ...styles.tipoDot, background: TIPO_COLORS[tipo] }} />
              <span style={{ color: TIPO_COLORS[tipo], fontWeight: 600 }}>{byTipo[tipo] || 0}</span>
              <span style={styles.tipoName}>{tipo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' },
  value: { fontSize: 32, fontWeight: 700, lineHeight: 1 },
  label: { fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--text)' },
  sub: { fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  tipoLabel: { fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tipoRow: { display: 'flex', gap: 32 },
  tipoItem: { display: 'flex', alignItems: 'center', gap: 8 },
  tipoDot: { width: 8, height: 8, borderRadius: '50%' },
  tipoName: { color: 'var(--muted)', fontSize: 13 },
}
