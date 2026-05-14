import React from 'react'

const STATUS_FIELDS = [
  { key: 'contrato',       label: 'Contrato',      colors: { 'Assinado': 'green', 'Não assinado': 'red' } },
  { key: 'pagamento',      label: 'Pagamento',     colors: { 'Concluido': 'green', 'Pendente': 'yellow' } },
  { key: 'onboarding',     label: 'Onboarding',    colors: { 'Concluido': 'green', 'Pendente': 'yellow' } },
  { key: 'tarefas',        label: 'Tarefas',       colors: { 'Concluída': 'green', 'Não iniciada': 'muted' } },
  { key: 'implementacao',  label: 'Implementação', colors: { 'Concluída': 'green', 'Não agendada': 'muted' } },
  { key: 'tarefas_pos',    label: 'Pós-impl.',     colors: { 'Em execução': 'blue', 'Apresentado': 'green', 'Não iniciada': 'muted', 'Não apresentado': 'yellow' } },
  { key: 'ativo_tutorias', label: 'Tutoria',       colors: { 'Sim': 'green', 'Não': 'yellow' } },
  { key: 'saude_financeira', label: 'Saúde Fin.',  colors: { 'Adiplente': 'green', 'Inadiplente': 'red' } },
]

const COLOR = {
  green: 'var(--green)',
  red: 'var(--red)',
  yellow: 'var(--yellow)',
  blue: 'var(--blue)',
  muted: 'var(--muted)',
}

const TIPO_STYLE = {
  anotacao: { bg: 'var(--blue-dim)',   color: 'var(--blue)',   label: 'Anotação' },
  status:   { bg: 'var(--accent-dim)', color: 'var(--accent)', label: 'Status'   },
  alerta:   { bg: 'var(--red-dim)',    color: 'var(--red)',    label: 'Alerta'   },
  disparo:  { bg: 'var(--green-dim)',  color: 'var(--green)',  label: 'Disparo'  },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function MentoradoDetalhe({ mentorado, logs, onBack }) {
  const hasAlerta = logs.some(l => l.tipo === 'alerta')

  return (
    <div>
      <button onClick={onBack} style={s.back}>← Voltar para Mentorados</button>

      <div style={s.header}>
        <div style={{ ...s.avatar, background: hasAlerta ? 'var(--red-dim)' : 'var(--accent-dim)', color: hasAlerta ? 'var(--red)' : 'var(--accent)' }}>
          {mentorado.nome[0]}
        </div>
        <div>
          <div style={s.nome}>{mentorado.nome}</div>
          <div style={s.tutor}>Tutor: {mentorado.tutor || '—'}</div>
        </div>
      </div>

      <div style={s.statusGrid}>
        {STATUS_FIELDS.map(({ key, label, colors }) => {
          const val = mentorado[key]
          const colorKey = val ? (colors[val] || 'muted') : 'muted'
          return (
            <div key={key} style={s.statusCard}>
              <div style={s.statusLabel}>{label}</div>
              <div style={{ ...s.statusVal, color: COLOR[colorKey] }}>{val || '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          Histórico de atividade
          <span style={s.badge}>{logs.length}</span>
        </div>

        {logs.length === 0 ? (
          <div style={s.empty}>Nenhum log registrado para este restaurante ainda.</div>
        ) : (
          <div style={s.logList}>
            {logs.map(log => {
              const tipo = TIPO_STYLE[log.tipo] || { bg: '#ffffff08', color: 'var(--muted)', label: log.tipo }
              return (
                <div key={log.id} style={s.logRow}>
                  <div style={{ ...s.tipoBadge, background: tipo.bg, color: tipo.color }}>{tipo.label}</div>
                  <div style={s.logDesc}>{log.descricao || '—'}</div>
                  <div style={s.logTime}>{timeAgo(log.created_at)}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  back: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '0 0 20px', display: 'block' },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0 },
  nome: { fontSize: 22, fontWeight: 700 },
  tutor: { color: 'var(--muted)', fontSize: 13, marginTop: 3 },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 20 },
  statusCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' },
  statusLabel: { fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 },
  statusVal: { fontSize: 13, fontWeight: 600 },
  section: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  sectionHeader: { padding: '14px 20px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 },
  badge: { background: 'var(--surface2)', borderRadius: 20, padding: '2px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 },
  empty: { padding: 48, textAlign: 'center', color: 'var(--muted)' },
  logList: { maxHeight: 600, overflowY: 'auto' },
  logRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' },
  tipoBadge: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, flexShrink: 0, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' },
  logDesc: { flex: 1, fontSize: 13, color: 'var(--text)', minWidth: 0 },
  logTime: { color: 'var(--muted)', fontSize: 12, flexShrink: 0, marginTop: 1 },
}
