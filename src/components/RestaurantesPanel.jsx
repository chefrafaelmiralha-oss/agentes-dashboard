import React from 'react'

export default function RestaurantesPanel({ logs }) {
  const byRestaurante = logs.reduce((acc, l) => {
    if (!l.restaurante) return acc
    if (!acc[l.restaurante]) acc[l.restaurante] = { total: 0, alertas: 0, ultima: null }
    acc[l.restaurante].total++
    if (l.tipo === 'alerta') acc[l.restaurante].alertas++
    if (!acc[l.restaurante].ultima || l.created_at > acc[l.restaurante].ultima)
      acc[l.restaurante].ultima = l.created_at
    return acc
  }, {})

  const lista = Object.entries(byRestaurante)
    .sort((a, b) => b[1].total - a[1].total)

  if (lista.length === 0) return (
    <div style={styles.container}>
      <div style={styles.header}>Restaurantes</div>
      <div style={styles.empty}>Nenhum dado ainda.</div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>Restaurantes <span style={styles.count}>{lista.length}</span></div>
      <div style={styles.list}>
        {lista.map(([nome, info]) => (
          <div key={nome} style={styles.row}>
            <div style={styles.avatar}>{nome[0]}</div>
            <div style={styles.info}>
              <div style={styles.nome}>{nome}</div>
              <div style={styles.meta}>
                {info.ultima && new Date(info.ultima).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div style={styles.stats}>
              <span style={styles.total}>{info.total}</span>
              {info.alertas > 0 && (
                <span style={styles.alerta}>⚠ {info.alertas}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  header: { padding: '16px 20px', fontWeight: 700, fontSize: 15, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 },
  count: { background: 'var(--surface2)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 },
  list: { maxHeight: 400, overflowY: 'auto' },
  empty: { padding: 30, textAlign: 'center', color: 'var(--muted)' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)' },
  avatar: { width: 34, height: 34, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  nome: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { color: 'var(--muted)', fontSize: 11, marginTop: 1 },
  stats: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  total: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  alerta: { fontSize: 11, color: 'var(--yellow)', fontWeight: 600 },
}
