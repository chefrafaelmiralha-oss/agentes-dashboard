import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import AgentStatus from './components/AgentStatus.jsx'
import StatsCards from './components/StatsCards.jsx'
import LogFeed from './components/LogFeed.jsx'
import MentoradosGrid from './components/MentoradosGrid.jsx'
import MentoradoDetalhe from './components/MentoradoDetalhe.jsx'
import Agendamentos from './components/agendamentos/Agendamentos.jsx'

const AGENT = { id: 'gl-mentorados', url: import.meta.env.VITE_AGENT_GL_URL }

const TABS = [
  { id: 'geral', label: 'Visão Geral' },
  { id: 'mentorados', label: 'Mentorados' },
  { id: 'agendamentos', label: 'Agendamentos' },
]

export default function App() {
  const [tab, setTab] = useState('geral')
  const [logs, setLogs] = useState([])
  const [mentorados, setMentorados] = useState([])
  const [loading, setLoading] = useState(true)
  const [realtimeActive, setRealtimeActive] = useState(false)
  const [selectedMentorado, setSelectedMentorado] = useState(null)

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('agente_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agente_logs' }, payload => {
        if (payload.new.tipo !== 'alerta_grupo_geral') {
          setLogs(prev => [payload.new, ...prev])
        }
      })
      .subscribe(status => setRealtimeActive(status === 'SUBSCRIBED'))
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [logsRes, mentRes] = await Promise.all([
      supabase
        .from('agente_logs')
        .select('*')
        .neq('tipo', 'alerta_grupo_geral')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('mentorados')
        .select('id,nome,tutor,contrato,pagamento,onboarding,tarefas,implementacao,tarefas_pos,ativo_tutorias,saude_financeira,agente_ativo,whatsapp_group_id')
        .eq('agente_ativo', true)
        .order('nome'),
    ])
    if (!logsRes.error) setLogs(logsRes.data || [])
    if (!mentRes.error) setMentorados(mentRes.data || [])
    setLoading(false)
  }

  function handleTabChange(id) {
    setTab(id)
    setSelectedMentorado(null)
  }

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.brand}>
          <div style={s.logo}>GL</div>
          <div>
            <div style={s.title}>Monitor de Mentorados</div>
            <div style={s.subtitle}>Gastronomia Lucrativa</div>
          </div>
        </div>
        <div style={s.headerRight}>
          {realtimeActive && (
            <div style={s.realtime}>
              <span style={s.realtimeDot} />
              Realtime
            </div>
          )}
          <AgentStatus agent={AGENT} />
          <button onClick={fetchAll} style={s.refreshBtn}>↻ Atualizar</button>
        </div>
      </header>

      <nav style={s.nav}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{ ...s.navTab, ...(tab === t.id ? s.navTabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={s.main}>
        {tab === 'geral' && (
          loading ? (
            <div style={s.loading}>Carregando…</div>
          ) : (
            <>
              <StatsCards logs={logs} mentorados={mentorados} />
              <LogFeed logs={logs} loading={loading} />
            </>
          )
        )}

        {tab === 'mentorados' && (
          selectedMentorado ? (
            <MentoradoDetalhe
              mentorado={selectedMentorado}
              logs={logs.filter(l => l.restaurante === selectedMentorado.nome)}
              onBack={() => setSelectedMentorado(null)}
            />
          ) : (
            <MentoradosGrid
              mentorados={mentorados}
              logs={logs}
              loading={loading}
              onSelect={setSelectedMentorado}
            />
          )
        )}

        {tab === 'agendamentos' && <Agendamentos agent={AGENT} />}
      </main>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  header: { borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' },
  title: { fontWeight: 700, fontSize: 15 },
  subtitle: { color: 'var(--muted)', fontSize: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  realtime: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' },
  realtimeDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' },
  refreshBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  nav: { display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 28px' },
  navTab: { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', padding: '12px 20px', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: -1, transition: 'color 0.15s' },
  navTabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  main: { flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto', width: '100%' },
  loading: { textAlign: 'center', color: 'var(--muted)', padding: 80 },
}
