import React, { useEffect, useRef, useState } from 'react'
import { renderTemplate, buildContext } from '../../lib/scheduler-api.js'

const KIND_OPTIONS = [
  { value: 'd_minus_1',       label: 'D-1 (dia anterior)' },
  { value: 'one_hour_before', label: '1h antes' },
  { value: 'at_time',         label: 'Na hora' },
  { value: 'd_plus_1',        label: 'D+1 (dia seguinte)' },
  { value: 'custom',          label: 'Customizado' },
]

const VARS = ['{nome_evento}', '{data}', '{hora}', '{link}']

const FAKE_CTX = {
  nome_evento: 'Webinar GL',
  data: '25/04',
  hora: '19:00',
  link: 'https://meet.google.com/abc-defg-hij',
}

function emptyItem() {
  return { kind: 'at_time', offset_minutes: 0, message_body: '', ordem: 0, _key: Math.random() }
}

export default function Templates({ api, showToast }) {
  const [templates, setTemplates]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)  // null | {mode, data}
  const [confirm, setConfirm]       = useState(null)  // null | {id, nome}
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState(null)  // {index, text} para preview inline
  const activeTextareaRef           = useRef(null)    // índice do textarea ativo
  const textareaRefs                = useRef({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setTemplates(await api.listTemplates()) } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  function openCreate() {
    setModal({
      mode: 'create',
      data: { nome: '', descricao: '', default_hora: '19:00', itens: [emptyItem()] },
    })
    setPreview(null)
  }

  async function openEdit(t) {
    try {
      const full = await api.getTemplate(t.id)
      setModal({
        mode: 'edit',
        data: {
          _id: t.id,
          nome: full.nome,
          descricao: full.descricao || '',
          default_hora: full.default_hora || '',
          itens: full.itens.map(i => ({ ...i, _key: Math.random() })),
        },
      })
      setPreview(null)
    } catch (e) { showToast(e.message, 'error') }
  }

  function setField(key, val) {
    setModal(m => ({ ...m, data: { ...m.data, [key]: val } }))
  }

  function setItemField(idx, key, val) {
    setModal(m => {
      const itens = [...m.data.itens]
      itens[idx] = { ...itens[idx], [key]: val }
      return { ...m, data: { ...m.data, itens } }
    })
  }

  function addItem() {
    setModal(m => ({ ...m, data: { ...m.data, itens: [...m.data.itens, emptyItem()] } }))
  }

  function removeItem(idx) {
    setModal(m => {
      const itens = m.data.itens.filter((_, i) => i !== idx)
      return { ...m, data: { ...m.data, itens } }
    })
  }

  function insertVar(v) {
    const idx = activeTextareaRef.current
    if (idx == null) return
    const el = textareaRefs.current[idx]
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const body  = modal.data.itens[idx].message_body
    const next  = body.slice(0, start) + v + body.slice(end)
    setItemField(idx, 'message_body', next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + v.length, start + v.length)
    }, 0)
  }

  function togglePreview(idx) {
    if (preview?.index === idx) { setPreview(null); return }
    const body = modal.data.itens[idx].message_body
    setPreview({ index: idx, text: renderTemplate(body, FAKE_CTX) })
  }

  async function save() {
    const { data } = modal
    if (!data.nome.trim()) { showToast('Nome é obrigatório', 'error'); return }
    if (data.itens.length === 0) { showToast('Adicione ao menos um item', 'error'); return }
    if (data.itens.some(i => !i.message_body.trim())) {
      showToast('Todos os itens precisam ter um texto', 'error'); return
    }
    setSaving(true)
    const payload = {
      nome: data.nome.trim(),
      descricao: data.descricao || null,
      default_hora: data.default_hora || null,
      itens: data.itens.map((item, i) => ({
        kind: item.kind,
        offset_minutes: Number(item.offset_minutes),
        message_body: item.message_body,
        ordem: i,
      })),
    }
    try {
      if (modal.mode === 'create') {
        await api.createTemplate(payload)
        showToast('Template criado')
      } else {
        await api.updateTemplate(data._id, payload)
        showToast('Template atualizado')
      }
      setModal(null)
      await load()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  async function confirmDelete() {
    try {
      await api.deleteTemplate(confirm.id)
      showToast('Template desativado')
      setConfirm(null)
      await load()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Templates</div>
          <div style={s.sub}>{templates.length} template{templates.length !== 1 ? 's' : ''}</div>
        </div>
        <button style={s.btnPrimary} onClick={openCreate}>+ Novo template</button>
      </div>

      {loading ? (
        <div style={s.empty}>Carregando…</div>
      ) : templates.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 36 }}>📋</div>
          <div style={s.emptyTitle}>Nenhum template</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Crie um template para definir a sequência de mensagens dos seus eventos.</div>
          <button style={s.btnPrimary} onClick={openCreate}>+ Novo template</button>
        </div>
      ) : (
        <div style={s.list}>
          {templates.map(t => (
            <div key={t.id} style={s.card}>
              <div style={s.cardLeft}>
                <div>
                  <div style={s.cardName}>{t.nome}</div>
                  {t.descricao && <div style={s.cardDesc}>{t.descricao}</div>}
                  <div style={s.cardMeta}>
                    {t.total_itens} item{t.total_itens !== 1 ? 's' : ''}
                    {t.default_hora && <> · hora padrão: {t.default_hora}</>}
                    {t.total_eventos_futuros > 0 && (
                      <span style={s.futureTag}> · {t.total_eventos_futuros} evento{t.total_eventos_futuros !== 1 ? 's' : ''} futuro{t.total_eventos_futuros !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={s.cardRight}>
                <span style={s.badge(t.ativo ? 'green' : 'muted')}>{t.ativo ? 'Ativo' : 'Inativo'}</span>
                <button style={s.btnSm} onClick={() => openEdit(t)}>Editar</button>
                <button style={s.btnSmDanger} onClick={() => setConfirm({ id: t.id, nome: t.nome, futuros: t.total_eventos_futuros })}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modalLg} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{modal.mode === 'create' ? 'Novo template' : 'Editar template'}</div>

            <div style={s.row2}>
              <div style={{ flex: 2 }}>
                <label style={s.label}>Nome *</label>
                <input style={s.input} value={modal.data.nome} placeholder="Ex: Webinar Padrão"
                  onChange={e => setField('nome', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Hora padrão (sugestão UI)</label>
                <input style={s.input} value={modal.data.default_hora} placeholder="19:00"
                  onChange={e => setField('default_hora', e.target.value)} />
              </div>
            </div>

            <label style={s.label}>Descrição</label>
            <input style={s.input} value={modal.data.descricao} placeholder="Opcional"
              onChange={e => setField('descricao', e.target.value)} />

            {/* Chips de variáveis */}
            <div style={s.varSection}>
              <span style={s.varLabel}>Variáveis disponíveis (clique para inserir no texto ativo):</span>
              <div style={s.varChips}>
                {VARS.map(v => (
                  <button key={v} style={s.chip} onClick={() => insertVar(v)}>{v}</button>
                ))}
              </div>
            </div>

            {/* Itens */}
            <div style={s.itemsHeader}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Itens do template</span>
              <button style={s.btnSm} onClick={addItem}>+ Adicionar item</button>
            </div>

            <div style={s.itemsList}>
              {modal.data.itens.map((item, idx) => (
                <div key={item._key ?? idx} style={s.itemCard}>
                  <div style={s.itemHeader}>
                    <span style={s.itemNum}>#{idx + 1}</span>
                    {modal.data.itens.length > 1 && (
                      <button style={s.btnTiny} onClick={() => removeItem(idx)}>✕</button>
                    )}
                  </div>

                  <div style={s.row2}>
                    <div style={{ flex: 1 }}>
                      <label style={s.label}>Tipo</label>
                      <select style={s.select} value={item.kind}
                        onChange={e => setItemField(idx, 'kind', e.target.value)}>
                        {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={s.label}>Offset (min) — negativo = antes do evento</label>
                      <input type="number" style={s.input} value={item.offset_minutes}
                        onChange={e => setItemField(idx, 'offset_minutes', e.target.value)}
                        placeholder="Ex: -1440 = 1 dia antes" />
                    </div>
                  </div>

                  <label style={s.label}>Texto da mensagem</label>
                  <textarea
                    ref={el => { textareaRefs.current[idx] = el }}
                    style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                    value={item.message_body}
                    placeholder="Use {nome_evento}, {data}, {hora}, {link}"
                    onFocus={() => { activeTextareaRef.current = idx }}
                    onChange={e => { setItemField(idx, 'message_body', e.target.value); setPreview(null) }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <button style={s.btnTinySec} onClick={() => togglePreview(idx)}>
                      {preview?.index === idx ? 'Ocultar preview' : 'Preview com dados fake'}
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      offset {item.offset_minutes >= 0 ? '+' : ''}{item.offset_minutes} min
                      {item.offset_minutes === -1440 ? ' (D-1)' : item.offset_minutes === 1440 ? ' (D+1)' : item.offset_minutes === -60 ? ' (1h antes)' : item.offset_minutes === 0 ? ' (na hora)' : ''}
                    </span>
                  </div>

                  {preview?.index === idx && (
                    <div style={s.previewBox}>
                      <div style={s.previewLabel}>Preview (dados fake):</div>
                      <div style={s.previewText}>{preview.text}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button style={s.btnPrimary} onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : modal.mode === 'create' ? 'Criar template' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar remoção */}
      {confirm && (
        <div style={s.overlay} onClick={() => setConfirm(null)}>
          <div style={s.modalSm} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Remover template</div>
            {confirm.futuros > 0 ? (
              <div style={s.warnBox}>
                Este template possui <strong>{confirm.futuros}</strong> evento{confirm.futuros !== 1 ? 's' : ''} futuro{confirm.futuros !== 1 ? 's' : ''} ativo{confirm.futuros !== 1 ? 's' : ''}. Cancele-os primeiro para poder remover o template.
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                Deseja desativar o template <strong>{confirm.nome}</strong>? Eventos históricos não são afetados.
              </div>
            )}
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setConfirm(null)}>Cancelar</button>
              {confirm.futuros === 0 && (
                <button style={s.btnDanger} onClick={confirmDelete}>Remover</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title:       { fontSize: 16, fontWeight: 700 },
  sub:         { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  empty:       { textAlign: 'center', color: 'var(--muted)', padding: 60 },
  emptyBox:    { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyTitle:  { fontSize: 15, fontWeight: 600 },
  list:        { display: 'flex', flexDirection: 'column', gap: 10 },
  card:        { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  cardLeft:    { flex: 1, minWidth: 0 },
  cardName:    { fontSize: 14, fontWeight: 600 },
  cardDesc:    { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  cardMeta:    { fontSize: 12, color: 'var(--muted)', marginTop: 4 },
  futureTag:   { color: 'var(--accent)' },
  cardRight:   { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  badge:       (c) => ({ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: c === 'green' ? 'var(--green-dim)' : 'var(--surface2)', color: c === 'green' ? 'var(--green)' : 'var(--muted)' }),
  btnPrimary:  { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSecondary:{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnDanger:   { background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSm:       { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSmDanger: { background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnTiny:     { background: 'transparent', color: 'var(--muted)', border: 'none', fontSize: 13, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  btnTinySec:  { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalLg:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  modalSm:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitle:  { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  modalActions:{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  row2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label:       { fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 },
  input:       { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' },
  select:      { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', boxSizing: 'border-box' },
  varSection:  { background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  varLabel:    { fontSize: 11, color: 'var(--muted)' },
  varChips:    { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip:        { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600 },
  itemsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  itemsList:   { display: 'flex', flexDirection: 'column', gap: 12 },
  itemCard:    { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  itemHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  itemNum:     { fontSize: 11, fontWeight: 700, color: 'var(--muted)' },
  previewBox:  { background: 'var(--surface2)', borderRadius: 6, padding: '10px 14px', marginTop: 4 },
  previewLabel:{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 },
  previewText: { fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 },
  warnBox:     { background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.6 },
}
