import React, { useState } from 'react'
import { createSchedulerApi } from '../../lib/scheduler-api.js'
import Eventos from './Eventos.jsx'
import Templates from './Templates.jsx'
import Grupos from './Grupos.jsx'
import Fila from './Fila.jsx'

const TABS = [
  { id: 'eventos',   label: 'Eventos' },
  { id: 'templates', label: 'Templates' },
  { id: 'grupos',    label: 'Grupos' },
  { id: 'fila',      label: 'Fila' },
]

export default function Agendamentos({ agent }) {
  const [tab, setTab]     = useState('eventos')
  const [toast, setToast] = useState(null)

  const api = createSchedulerApi(agent.url)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const shared = { api, showToast }

  return (
    <div style={s.root}>
      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>
        {tab === 'eventos'   && <Eventos   {...shared} />}
        {tab === 'templates' && <Templates {...shared} />}
        {tab === 'grupos'    && <Grupos    {...shared} />}
        {tab === 'fila'      && <Fila      {...shared} />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? 'var(--red)' : '#1a7a3a' }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

const s = {
  root:       { display: 'flex', flexDirection: 'column', gap: 0, flex: 1 },
  tabs:       { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0, marginBottom: 20 },
  tab:        { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', padding: '8px 16px', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s', marginBottom: -1 },
  tabActive:  { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  content:    { flex: 1 },
  toast:      { position: 'fixed', bottom: 28, right: 28, color: '#fff', padding: '12px 20px', borderRadius: 8, zIndex: 1000, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: 360 },
}
