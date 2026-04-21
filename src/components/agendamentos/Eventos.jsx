import React, { useEffect, useState } from 'react'
import {
  eventStatus, formatInSP, STATUS_LABEL, KIND_LABEL,
  previewMessages, localToSpIso, isoToLocalSP,
} from '../../lib/scheduler-api.js'

const STATUS_COLORS = {
  upcoming:  { bg: 'var(--blue-dim)',   color: 'var(--blue)' },
  live:      { bg: 'var(--green-dim)',  color: 'var(--green)' },
  past:      { bg: 'var(--surface2)',   color: 'var(--muted)' },
  cancelled: { bg: 'var(--red-dim)',    color: 'var(--red)' },
}

const MSG_STATUS_COLORS = {
  pending:   { bg: 'var(--yellow-dim)', color: 'var(--yellow)' },
  sent:      { bg: 'var(--green-dim)',  color: 'var(--green)' },
  failed:    { bg: 'var(--red-dim)',    color: 'var(--red)' },
  cancelled: { bg: 'var(--surface2)',   color: 'var(--muted)' },
  processing:{ bg: 'var(--blue-dim)',   color: 'var(--blue)' },
}

const FILTERS = [
  { value: '',          label: 'Todos' },
  { value: 'upcoming',  label: 'Próximos' },
  { value: 'past',      label: 'Passados' },
  { value: 'cancelled', label: 'Cancelados' },
]

function emptyForm() {
  return { template_id: '', group_id: '', nome_evento: '', starts_at: '', link: '', dry_run: false }
}

export default function Eventos({ api, showToast }) {
  const [events, setEvents]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('')
  const [groups, setGroups]         = useState([])
  const [templates, setTemplates]   = useState([])
  const [templateItems, setTemplateItems] = useState([]) // itens do template selecionado
  const [modal, setModal]           = useState(null)  // null | {mode, form, orig?}
  const [detail, setDetail]         = useState(null)  // evento completo para modal detalhe
  const [confirm, setConfirm]       = useState(null)  // {id, nome}
  const [saving, setSaving]         = useState(false)
  const [loadingTpl, setLoadingTpl] = useState(false)

  useEffect(() => { load() }, [filter])
  useEffect(() => {
    api.listGroups().then(g => setGroups(g.filter(x => x.ativo))).catch(() => {})
    api.listTemplates().then(t => setTemplates(t.filter(x => x.ativo))).catch(() => {})
  }, [])

  async function load() {
    setLoading(true)
    try { setEvents(await api.listEvents(filter || undefined)) } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  async function openCreate() {
    setTemplateItems([])
    setModal({ mode: 'create', form: emptyForm() })
  }

  async function openEdit(ev) {
    let itens = []
    try {
      const tpl = await api.getTemplate(ev.template_id)
      itens = tpl.itens || []
    } catch (_) {}
    setTemplateItems(itens)
    setModal({
      mode: 'edit',
      orig: ev,
      form: {
        template_id: ev.template_id,
        group_id:    ev.group_id,
        nome_evento: ev.nome_evento,
        starts_at:   isoToLocalSP(ev.starts_at),
        link:        ev.link,
        dry_run:     ev.dry_run,
        _id:         ev.id,
      },
    })
  }

  async function openDetail(ev) {
    try {
      const full = await api.getEvent(ev.id)
      setDetail(full)
    } catch (e) { showToast(e.message, 'error') }
  }

  function setField(key, val) {
    setModal(m => ({ ...m, form: { ...m.form, [key]: val } }))
  }

  async function onTemplateChange(tplId) {
    setField('template_id', tplId)
    setTemplateItems([])
    if (!tplId) return
    setLoadingTpl(true)
    try {
      const tpl = await api.getTemplate(tplId)
      setTemplateItems(tpl.itens || [])
      // pré-preenche starts_at com default_hora se ainda não preenchido
      if (tpl.default_hora && !modal?.form?.starts_at) {
        const today = new Date()
        const [h, m] = tpl.default_hora.split(':').map(Number)
        today.setHours(h, m, 0, 0)
        const dateStr = today.toISOString().slice(0, 10)
        setField('starts_at', `${dateStr}T${tpl.default_hora}`)
      }
    } catch (_) {}
    setLoadingTpl(false)
  }

  async function save() {
    const { form } = modal
    if (!form.template_id) { showToast('Selecione um template', 'error'); return }
    if (!form.group_id)    { showToast('Selecione um grupo', 'error'); return }
    if (!form.nome_evento.trim()) { showToast('Nome do evento é obrigatório', 'error'); return }
    if (!form.starts_at)   { showToast('Data/hora são obrigatórios', 'error'); return }
    if (!form.link.trim()) { showToast('Link é obrigatório', 'error'); return }

    setSaving(true)
    try {
      const payload = {
        template_id: form.template_id,
        group_id:    form.group_id,
        nome_evento: form.nome_evento.trim(),
        starts_at:   localToSpIso(form.starts_at),
        link:        form.link.trim(),
        dry_run:     form.dry_run,
      }
      if (modal.mode === 'create') {
        await api.createEvent(payload)
        showToast('Evento criado e mensagens agendadas')
      } else {
        await api.updateEvent(form._id, {
          nome_evento: payload.nome_evento,
          starts_at:   payload.starts_at,
          link:        payload.link,
          dry_run:     payload.dry_run,
        })
        showToast('Evento atualizado — mensagens pendentes foram regeneradas')
      }
      setModal(null)
      setTemplateItems([])
      await load()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  async function confirmCancel() {
    try {
      await api.cancelEvent(confirm.id)
      showToast('Evento cancelado')
      setConfirm(null)
      if (detail?.id === confirm.id) setDetail(null)
      await load()
    } catch (e) { showToast(e.message, 'error') }
  }

  const preview = modal
    ? previewMessages(
        templateItems,
        modal.form.nome_evento,
        modal.form.starts_at ? localToSpIso(modal.form.starts_at) : null,
        modal.form.link,
      )
    : []

  // Summary
  const now = Date.now()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const summary = {
    total:     events.length,
    proximos:  events.filter(e => !e.cancelled_at && new Date(e.starts_at) > now).length,
    pendentes: events.reduce((acc, e) => acc + (e.pendentes || 0), 0),
    enviadasHoje: 0, // mensagens sent com sent_at hoje — approximation
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={s.cards}>
        {[
          { label: 'Total eventos',      value: summary.total,     color: 'var(--text)' },
          { label: 'Próximos',           value: summary.proximos,  color: 'var(--blue)' },
          { label: 'Msgs pendentes',     value: summary.pendentes, color: 'var(--yellow)' },
        ].map(c => (
          <div key={c.label} style={s.card}>
            <div style={{ ...s.cardVal, color: c.color }}>{c.value}</div>
            <div style={s.cardLabel}>{c.label}</div>
          </div>
        ))}
        <button style={s.newBtn} onClick={openCreate}>+ Novo evento</button>
      </div>

      {/* Filter tabs */}
      <div style={s.filterTabs}>
        {FILTERS.map(f => (
          <button key={f.value} style={{ ...s.filterTab, ...(filter === f.value ? s.filterTabActive : {}) }}
            onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
        <button style={{ ...s.filterTab, marginLeft: 'auto', color: 'var(--muted)' }} onClick={load}>↻</button>
      </div>

      {loading ? (
        <div style={s.empty}>Carregando…</div>
      ) : events.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 36 }}>📅</div>
          <div style={s.emptyTitle}>Nenhum evento</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {filter ? 'Nenhum evento com esse filtro.' : 'Crie o primeiro evento para agendar mensagens.'}
          </div>
          {!filter && <button style={s.btnPrimary} onClick={openCreate}>+ Novo evento</button>}
        </div>
      ) : (
        <div style={s.eventList}>
          {events.map(ev => {
            const st = eventStatus(ev)
            const stColor = STATUS_COLORS[st] || STATUS_COLORS.past
            return (
              <div key={ev.id} style={s.eventCard} onClick={() => openDetail(ev)}>
                <div style={s.eventCardTop}>
                  <div style={s.eventInfo}>
                    <div style={s.eventName}>{ev.nome_evento}</div>
                    <div style={s.eventMeta}>
                      {ev.group_nome && <span>{ev.group_nome}</span>}
                      {ev.template_nome && <span style={{ color: 'var(--accent)' }}>{ev.template_nome}</span>}
                      {ev.dry_run && <span style={s.dryBadge}>DRY RUN</span>}
                    </div>
                  </div>
                  <div style={s.eventRight}>
                    <span style={{ ...s.badge, ...stColor }}>{STATUS_LABEL[st] ?? st}</span>
                    <div style={s.eventDate}>{formatInSP(ev.starts_at)}</div>
                  </div>
                </div>
                <div style={s.eventFooter}>
                  <div style={s.msgCounts}>
                    <span style={{ color: 'var(--green)' }}>✓ {ev.enviadas ?? 0} enviadas</span>
                    <span style={{ color: 'var(--yellow)' }}>⏳ {ev.pendentes ?? 0} pendentes</span>
                    {(ev.falhas ?? 0) > 0 && <span style={{ color: 'var(--red)' }}>✗ {ev.falhas} falhas</span>}
                  </div>
                  <div style={s.eventActions} onClick={e => e.stopPropagation()}>
                    <button style={s.actBtn} onClick={() => openEdit(ev)}>Editar</button>
                    {!ev.cancelled_at && (
                      <button style={s.actBtnDanger} onClick={() => setConfirm({ id: ev.id, nome: ev.nome_evento })}>Cancelar</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar com preview */}
      {modal && (
        <div style={s.overlay} onClick={() => { setModal(null); setTemplateItems([]) }}>
          <div style={s.modalXl} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{modal.mode === 'create' ? 'Novo evento' : 'Editar evento'}</div>

            <div style={s.formGrid}>
              {/* Coluna form */}
              <div style={s.formCol}>
                <label style={s.label}>Template *</label>
                <select style={s.select} value={modal.form.template_id}
                  onChange={e => onTemplateChange(e.target.value)}
                  disabled={modal.mode === 'edit'}>
                  <option value="">Selecione…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                {modal.mode === 'edit' && (
                  <div style={s.editNote}>Template não pode ser alterado após criação.</div>
                )}

                <label style={s.label}>Grupo WhatsApp *</label>
                <select style={s.select} value={modal.form.group_id}
                  onChange={e => setField('group_id', e.target.value)}
                  disabled={modal.mode === 'edit'}>
                  <option value="">Selecione…</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>

                <label style={s.label}>Nome do evento *</label>
                <input style={s.input} value={modal.form.nome_evento}
                  placeholder="Ex: Webinar GL Abril" onChange={e => setField('nome_evento', e.target.value)} />

                <label style={s.label}>Data e hora (horário SP) *</label>
                <input type="datetime-local" style={s.input} value={modal.form.starts_at}
                  onChange={e => setField('starts_at', e.target.value)} />

                <label style={s.label}>Link da sala *</label>
                <input style={s.input} value={modal.form.link}
                  placeholder="https://meet.google.com/..." onChange={e => setField('link', e.target.value)} />

                <div style={s.toggleRow}>
                  <div>
                    <span style={s.label}>Dry run</span>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Simula o envio sem disparar pelo WhatsApp</div>
                  </div>
                  <button style={s.toggle(modal.form.dry_run)} onClick={() => setField('dry_run', !modal.form.dry_run)}>
                    {modal.form.dry_run ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>

              {/* Coluna preview */}
              <div style={s.previewCol}>
                <div style={s.previewTitle}>
                  Preview das mensagens
                  {loadingTpl && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> — carregando template…</span>}
                </div>
                {preview.length === 0 ? (
                  <div style={s.previewEmpty}>
                    {!modal.form.template_id ? 'Selecione um template para ver o preview.' :
                     !modal.form.nome_evento || !modal.form.starts_at || !modal.form.link
                       ? 'Preencha nome, data/hora e link para visualizar.'
                       : 'Nenhum item no template.'}
                  </div>
                ) : (
                  <div style={s.previewList}>
                    {preview.map((msg, i) => (
                      <div key={i} style={s.previewItem}>
                        <div style={s.previewItemHeader}>
                          <span style={s.kindChip}>{KIND_LABEL[msg.kind] ?? msg.kind}</span>
                          <span style={s.previewSendAt}>{formatInSP(msg.send_at)}</span>
                        </div>
                        <div style={s.previewText}>{msg.message_text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => { setModal(null); setTemplateItems([]) }} disabled={saving}>Cancelar</button>
              <button style={s.btnPrimary} onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : modal.mode === 'create' ? `Criar evento (${preview.length} msgs)` : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe do evento */}
      {detail && (
        <div style={s.overlay} onClick={() => setDetail(null)}>
          <div style={s.modalLg} onClick={e => e.stopPropagation()}>
            <div style={s.detailHeader}>
              <div>
                <div style={s.modalTitle}>{detail.nome_evento}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {formatInSP(detail.starts_at)} · {detail.link}
                  {detail.dry_run && <span style={s.dryBadge}> DRY RUN</span>}
                </div>
              </div>
              <button style={s.btnTiny} onClick={() => setDetail(null)}>✕</button>
            </div>

            <div style={s.msgTable}>
              <div style={s.msgTableHeader}>
                {['Kind', 'Envio (SP)', 'Status', 'Texto'].map(h => (
                  <div key={h} style={s.msgTh}>{h}</div>
                ))}
              </div>
              {(detail.mensagens || []).map(msg => (
                <div key={msg.id} style={s.msgRow}>
                  <div style={s.msgTd}>{KIND_LABEL[msg.kind] ?? msg.kind}</div>
                  <div style={s.msgTd}>{formatInSP(msg.send_at)}</div>
                  <div style={s.msgTd}>
                    <span style={{ ...s.badge, ...(MSG_STATUS_COLORS[msg.status] || MSG_STATUS_COLORS.cancelled) }}>
                      {STATUS_LABEL[msg.status] ?? msg.status}
                    </span>
                  </div>
                  <div style={{ ...s.msgTd, flex: 3, fontSize: 12, color: 'var(--muted)', wordBreak: 'break-word' }}>
                    {msg.message_text}
                  </div>
                </div>
              ))}
              {(!detail.mensagens || detail.mensagens.length === 0) && (
                <div style={{ padding: '20px 14px', color: 'var(--muted)', fontSize: 13 }}>Nenhuma mensagem.</div>
              )}
            </div>

            {!detail.cancelled_at && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button style={s.btnSecondary} onClick={() => setDetail(null)}>Fechar</button>
                <button style={s.btnDanger} onClick={() => { setDetail(null); setConfirm({ id: detail.id, nome: detail.nome_evento }) }}>Cancelar evento</button>
              </div>
            )}
            {detail.cancelled_at && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button style={s.btnSecondary} onClick={() => setDetail(null)}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmar cancelamento */}
      {confirm && (
        <div style={s.overlay} onClick={() => setConfirm(null)}>
          <div style={s.modalSm} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Cancelar evento</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
              Deseja cancelar <strong>{confirm.nome}</strong>? Todas as mensagens pendentes serão canceladas.
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setConfirm(null)}>Voltar</button>
              <button style={s.btnDanger} onClick={confirmCancel}>Cancelar evento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  cards:       { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 20, alignItems: 'stretch' },
  card:        { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' },
  cardVal:     { fontSize: 26, fontWeight: 800, lineHeight: 1 },
  cardLabel:   { fontSize: 11, color: 'var(--muted)', marginTop: 4 },
  newBtn:      { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' },
  filterTabs:  { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 },
  filterTab:   { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', padding: '8px 14px', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: -1 },
  filterTabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  empty:       { textAlign: 'center', color: 'var(--muted)', padding: 60 },
  emptyBox:    { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyTitle:  { fontSize: 15, fontWeight: 600 },
  eventList:   { display: 'flex', flexDirection: 'column', gap: 10 },
  eventCard:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s' },
  eventCardTop:{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10 },
  eventInfo:   { flex: 1, minWidth: 0 },
  eventName:   { fontSize: 14, fontWeight: 700 },
  eventMeta:   { display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' },
  dryBadge:    { background: 'var(--yellow-dim)', color: 'var(--yellow)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 },
  eventRight:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  eventDate:   { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' },
  eventFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' },
  msgCounts:   { display: 'flex', gap: 14, fontSize: 12 },
  eventActions:{ display: 'flex', gap: 8 },
  badge:       { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 },
  actBtn:      { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  actBtnDanger:{ background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnPrimary:  { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSecondary:{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnDanger:   { background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnTiny:     { background: 'transparent', color: 'var(--muted)', border: 'none', fontSize: 16, cursor: 'pointer', padding: '0 4px' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalXl:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  modalLg:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  modalSm:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitle:  { fontSize: 15, fontWeight: 700 },
  modalActions:{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  formGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  formCol:     { display: 'flex', flexDirection: 'column', gap: 10 },
  previewCol:  { background: 'var(--bg)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--border)', minHeight: 200 },
  previewTitle:{ fontSize: 13, fontWeight: 700 },
  previewEmpty:{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 },
  previewList: { display: 'flex', flexDirection: 'column', gap: 10 },
  previewItem: { background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' },
  previewItemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  kindChip:    { fontSize: 10, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4 },
  previewSendAt:{ fontSize: 11, color: 'var(--muted)' },
  previewText: { fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  label:       { fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block' },
  input:       { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' },
  select:      { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', boxSizing: 'border-box' },
  toggleRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggle:      (on) => ({ background: on ? 'var(--yellow)' : 'var(--surface2)', color: on ? '#000' : 'var(--muted)', border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }),
  editNote:    { fontSize: 11, color: 'var(--muted)', marginTop: -4 },
  detailHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  msgTable:    { border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' },
  msgTableHeader: { display: 'grid', gridTemplateColumns: '100px 150px 100px 1fr', background: 'var(--surface2)', padding: '8px 14px', gap: 8 },
  msgTh:       { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  msgRow:      { display: 'grid', gridTemplateColumns: '100px 150px 100px 1fr', padding: '10px 14px', gap: 8, borderTop: '1px solid var(--border)', alignItems: 'start' },
  msgTd:       { fontSize: 13 },
}
