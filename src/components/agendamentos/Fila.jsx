import React, { useEffect, useState } from 'react'
import { formatInSP, STATUS_LABEL, KIND_LABEL, localToSpIso, isoToLocalSP } from '../../lib/scheduler-api.js'

const STATUS_COLORS = {
  pending:    { bg: 'var(--yellow-dim)', color: 'var(--yellow)' },
  processing: { bg: 'var(--blue-dim)',   color: 'var(--blue)' },
  sent:       { bg: 'var(--green-dim)',  color: 'var(--green)' },
  failed:     { bg: 'var(--red-dim)',    color: 'var(--red)' },
  cancelled:  { bg: 'var(--surface2)',   color: 'var(--muted)' },
}

const PAGE_SIZE = 50

export default function Fila({ api, showToast }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('') // '' = todos
  const [page, setPage]         = useState(0)
  const [editModal, setEditModal] = useState(null)  // message obj
  const [confirm, setConfirm]     = useState(null)  // {id, action}
  const [saving, setSaving]       = useState(false)
  const [editText, setEditText]   = useState('')
  const [editSendAt, setEditSendAt] = useState('')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    setPage(0)
    try {
      const params = { limit: 200 }
      if (filter) params.status = filter
      setMessages(await api.listMessages(params))
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const summary = {
    pendentes:    messages.filter(m => m.status === 'pending').length,
    enviadasHoje: messages.filter(m => m.status === 'sent' && m.sent_at && new Date(m.sent_at) >= today).length,
    falhas:       messages.filter(m => m.status === 'failed').length,
    canceladas:   messages.filter(m => m.status === 'cancelled').length,
  }

  const totalPages = Math.ceil(messages.length / PAGE_SIZE)
  const paged = messages.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openEdit(msg) {
    setEditText(msg.message_text)
    setEditSendAt(isoToLocalSP(msg.send_at))
    setEditModal(msg)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const data = {}
      if (editText !== editModal.message_text) data.message_text = editText
      if (editSendAt !== isoToLocalSP(editModal.send_at)) data.send_at = localToSpIso(editSendAt)
      if (Object.keys(data).length === 0) { setEditModal(null); setSaving(false); return }
      await api.updateMessage(editModal.id, data)
      showToast('Mensagem atualizada')
      setEditModal(null)
      await load()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  async function doAction(action, id) {
    try {
      if (action === 'cancel') await api.cancelMessage(id)
      else if (action === 'retry') await api.retryMessage(id)
      showToast(action === 'cancel' ? 'Mensagem cancelada' : 'Mensagem recolocada na fila')
      setConfirm(null)
      await load()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={s.cards}>
        {[
          { label: 'Pendentes',      value: summary.pendentes,    color: 'var(--yellow)' },
          { label: 'Enviadas hoje',  value: summary.enviadasHoje, color: 'var(--green)' },
          { label: 'Falhas',         value: summary.falhas,       color: 'var(--red)' },
          { label: 'Canceladas',     value: summary.canceladas,   color: 'var(--muted)' },
        ].map(c => (
          <div key={c.label} style={s.card}>
            <div style={{ ...s.cardVal, color: c.color }}>{c.value}</div>
            <div style={s.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + refresh */}
      <div style={s.toolbar}>
        <select style={s.select} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="processing">Processando</option>
          <option value="sent">Enviados</option>
          <option value="failed">Falhas</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <button style={s.btnSm} onClick={load}>↻ Atualizar</button>
        <span style={s.total}>{messages.length} mensagem{messages.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={s.empty}>Carregando…</div>
      ) : messages.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 36 }}>📭</div>
          <div style={s.emptyTitle}>Fila vazia</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {filter ? 'Nenhuma mensagem com esse filtro.' : 'Crie um evento para gerar mensagens agendadas.'}
          </div>
        </div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Evento', 'Kind', 'Envio (SP)', 'Status', 'Tentativas', 'Ações'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(msg => (
                  <tr key={msg.id} style={s.tr}>
                    <td style={s.td}>
                      <span style={s.mono} title={msg.event_id}>{msg.event_id.slice(0, 8)}…</span>
                    </td>
                    <td style={s.td}>{KIND_LABEL[msg.kind] ?? msg.kind}</td>
                    <td style={s.td}>{formatInSP(msg.send_at)}</td>
                    <td style={s.td}>
                      <span style={s.badge(msg.status)}>{STATUS_LABEL[msg.status] ?? msg.status}</span>
                    </td>
                    <td style={s.td}>
                      <span title={msg.last_error || ''}>{msg.attempts}{msg.last_error ? ' ⚠' : ''}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {msg.status === 'pending' && (
                          <>
                            <button style={s.actBtn} onClick={() => openEdit(msg)}>Editar</button>
                            <button style={s.actBtnDanger} onClick={() => setConfirm({ id: msg.id, action: 'cancel' })}>Cancelar</button>
                          </>
                        )}
                        {msg.status === 'failed' && (
                          <button style={s.actBtn} onClick={() => setConfirm({ id: msg.id, action: 'retry' })}>Retentar</button>
                        )}
                        {msg.last_error && (
                          <span style={s.errTip} title={msg.last_error}>ver erro</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={s.pagination}>
              <button style={s.btnSm} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Página {page + 1} de {totalPages}</span>
              <button style={s.btnSm} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima →</button>
            </div>
          )}
        </>
      )}

      {/* Modal editar mensagem pendente */}
      {editModal && (
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Editar mensagem pendente</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
              Kind: {KIND_LABEL[editModal.kind]} · Event: {editModal.event_id.slice(0, 8)}…
            </div>

            <label style={s.label}>Horário de envio (hora SP)</label>
            <input type="datetime-local" style={s.input} value={editSendAt}
              onChange={e => setEditSendAt(e.target.value)} />

            <label style={s.label}>Texto da mensagem</label>
            <textarea style={{ ...s.input, minHeight: 120, resize: 'vertical' }} value={editText}
              onChange={e => setEditText(e.target.value)} />

            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setEditModal(null)} disabled={saving}>Cancelar</button>
              <button style={s.btnPrimary} onClick={saveEdit} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar ação */}
      {confirm && (
        <div style={s.overlay} onClick={() => setConfirm(null)}>
          <div style={s.modalSm} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{confirm.action === 'cancel' ? 'Cancelar mensagem' : 'Retentar mensagem'}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
              {confirm.action === 'cancel'
                ? 'A mensagem será cancelada e não será enviada.'
                : 'A mensagem voltará para a fila e será enviada no próximo tick do worker.'}
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setConfirm(null)}>Voltar</button>
              <button
                style={confirm.action === 'cancel' ? s.btnDanger : s.btnPrimary}
                onClick={() => doAction(confirm.action, confirm.id)}
              >
                {confirm.action === 'cancel' ? 'Cancelar mensagem' : 'Retentar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  cards:       { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  card:        { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' },
  cardVal:     { fontSize: 26, fontWeight: 800, lineHeight: 1 },
  cardLabel:   { fontSize: 11, color: 'var(--muted)', marginTop: 4 },
  toolbar:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  total:       { fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' },
  select:      { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer' },
  empty:       { textAlign: 'center', color: 'var(--muted)', padding: 60 },
  emptyBox:    { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyTitle:  { fontSize: 15, fontWeight: 600 },
  tableWrap:   { overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' },
  tr:          { borderBottom: '1px solid var(--border)' },
  td:          { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  mono:        { fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' },
  badge:       (st) => ({ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, ...(STATUS_COLORS[st] || STATUS_COLORS.cancelled) }),
  actBtn:      { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  actBtnDanger:{ background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 5, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  errTip:      { fontSize: 11, color: 'var(--yellow)', cursor: 'help', textDecoration: 'underline dotted' },
  pagination:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
  btnSm:       { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:       { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 },
  modalSm:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitle:  { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  modalActions:{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  label:       { fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block' },
  input:       { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' },
  btnPrimary:  { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSecondary:{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnDanger:   { background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
}
