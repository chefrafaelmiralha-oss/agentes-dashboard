import React, { useEffect, useState } from 'react'

export default function Grupos({ api, showToast }) {
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | {mode:'create'|'edit', data?}
  const [confirm, setConfirm] = useState(null)   // null | {id, nome}
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setGroups(await api.listGroups()) } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  function openCreate() { setModal({ mode: 'create', data: { nome: '', group_id: '', descricao: '', ativo: true } }) }
  function openEdit(g)  { setModal({ mode: 'edit',   data: { nome: g.nome, group_id: g.group_id, descricao: g.descricao || '', ativo: g.ativo, _id: g.id } }) }
  function closeModal() { setModal(null) }

  function setField(key, val) {
    setModal(m => ({ ...m, data: { ...m.data, [key]: val } }))
  }

  async function save() {
    const { data } = modal
    if (!data.nome.trim() || !data.group_id.trim()) {
      showToast('Nome e Group ID são obrigatórios', 'error'); return
    }
    setSaving(true)
    try {
      if (modal.mode === 'create') {
        await api.createGroup({ nome: data.nome.trim(), group_id: data.group_id.trim(), descricao: data.descricao || null, ativo: data.ativo })
        showToast('Grupo criado com sucesso')
      } else {
        await api.updateGroup(data._id, { nome: data.nome.trim(), group_id: data.group_id.trim(), descricao: data.descricao || null, ativo: data.ativo })
        showToast('Grupo atualizado')
      }
      closeModal()
      await load()
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  async function confirmDelete() {
    try {
      await api.deleteGroup(confirm.id)
      showToast('Grupo desativado')
      setConfirm(null)
      await load()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Grupos WhatsApp</div>
          <div style={s.sub}>{groups.length} grupo{groups.length !== 1 ? 's' : ''} cadastrado{groups.length !== 1 ? 's' : ''}</div>
        </div>
        <button style={s.btnPrimary} onClick={openCreate}>+ Novo grupo</button>
      </div>

      {loading ? (
        <div style={s.empty}>Carregando…</div>
      ) : groups.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={s.emptyIcon}>📱</div>
          <div style={s.emptyTitle}>Nenhum grupo cadastrado</div>
          <div style={s.emptySub}>Crie o primeiro grupo para começar a agendar mensagens.</div>
          <button style={s.btnPrimary} onClick={openCreate}>+ Novo grupo</button>
        </div>
      ) : (
        <div style={s.list}>
          {groups.map(g => (
            <div key={g.id} style={s.card}>
              <div style={s.cardLeft}>
                <div style={s.cardDot(g.ativo)} />
                <div>
                  <div style={s.cardName}>{g.nome}</div>
                  <div style={s.cardId}>{g.group_id}</div>
                  {g.descricao && <div style={s.cardDesc}>{g.descricao}</div>}
                </div>
              </div>
              <div style={s.cardRight}>
                <span style={s.badge(g.ativo ? 'green' : 'muted')}>{g.ativo ? 'Ativo' : 'Inativo'}</span>
                <button style={s.btnSm} onClick={() => openEdit(g)}>Editar</button>
                <button style={s.btnSmDanger} onClick={() => setConfirm({ id: g.id, nome: g.nome })}>Desativar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{modal.mode === 'create' ? 'Novo grupo' : 'Editar grupo'}</div>

            <label style={s.label}>Nome do grupo *</label>
            <input style={s.input} value={modal.data.nome} placeholder="Ex: Mentorados Abril"
              onChange={e => setField('nome', e.target.value)} />

            <label style={s.label}>Group ID (formato 120363...@g.us) *</label>
            <input style={s.input} value={modal.data.group_id} placeholder="120363000000000001@g.us"
              onChange={e => setField('group_id', e.target.value)} />

            <label style={s.label}>Descrição</label>
            <input style={s.input} value={modal.data.descricao} placeholder="Opcional"
              onChange={e => setField('descricao', e.target.value)} />

            <div style={s.toggleRow}>
              <span style={s.label}>Ativo</span>
              <button style={s.toggle(modal.data.ativo)} onClick={() => setField('ativo', !modal.data.ativo)}>
                {modal.data.ativo ? 'Sim' : 'Não'}
              </button>
            </div>

            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={closeModal} disabled={saving}>Cancelar</button>
              <button style={s.btnPrimary} onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : modal.mode === 'create' ? 'Criar grupo' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar desativação */}
      {confirm && (
        <div style={s.overlay} onClick={() => setConfirm(null)}>
          <div style={s.modalSm} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Desativar grupo</div>
            <div style={s.confirmText}>Deseja desativar <strong>{confirm.nome}</strong>? O grupo ficará invisível nos formulários mas seus eventos históricos são preservados.</div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setConfirm(null)}>Cancelar</button>
              <button style={s.btnDanger} onClick={confirmDelete}>Desativar</button>
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
  emptyIcon:   { fontSize: 40 },
  emptyTitle:  { fontSize: 15, fontWeight: 600 },
  emptySub:    { fontSize: 13, color: 'var(--muted)', maxWidth: 340 },
  list:        { display: 'flex', flexDirection: 'column', gap: 10 },
  card:        { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  cardLeft:    { display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 },
  cardDot:     (ativo) => ({ width: 10, height: 10, borderRadius: '50%', background: ativo ? 'var(--green)' : 'var(--border)', marginTop: 4, flexShrink: 0 }),
  cardName:    { fontSize: 14, fontWeight: 600 },
  cardId:      { fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 2 },
  cardDesc:    { fontSize: 12, color: 'var(--muted)', marginTop: 4 },
  cardRight:   { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  badge:       (color) => ({
    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
    background: color === 'green' ? 'var(--green-dim)' : 'var(--surface2)',
    color: color === 'green' ? 'var(--green)' : 'var(--muted)',
  }),
  btnPrimary:  { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSecondary:{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnDanger:   { background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSm:       { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnSmDanger: { background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:       { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 10 },
  modalSm:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitle:  { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  modalActions:{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  label:       { fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block' },
  input:       { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' },
  toggleRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  toggle:      (on) => ({ background: on ? 'var(--green)' : 'var(--surface2)', color: on ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }),
  confirmText: { fontSize: 13, color: 'var(--text)', lineHeight: 1.6 },
}
