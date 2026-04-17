import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { AGENTS } from './lib/config.js'
import Sidebar from './components/Sidebar.jsx'
import AgentStatus from './components/AgentStatus.jsx'
import StatsCards from './components/StatsCards.jsx'
import LogFeed from './components/LogFeed.jsx'
import RestaurantesPanel from './components/RestaurantesPanel.jsx'
import Playground from './components/Playground.jsx'
import Validacao from './components/Validacao.jsx'

export default function App() {
  const [activeAgent, setActiveAgent] = useState(AGENTS.find(a => a.active))
  const [tab, setTab] = useState('logs')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [realtimeActive, setRealtimeActive] = useState(false)

  useEffect(() => {
    fetchLogs()
    const channel = supabase
      .channel('agente_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agente_logs' }, payload => {
        setLogs(prev => [payload.new, ...prev])
      })
      .subscribe(status => setRealtimeActive(status === 'SUBSCRIBED'))
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchLogs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('agente_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setLogs(data || [])
    setLoading(false)
  }

  const tabs = [
    { id: 'logs', label: 'Logs' },
    { id: 'playground', label: 'Playground' },
    { id: 'validacao', label: 'Validação E2E' },
  ]

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>GL</div>
          <div>
            <div style={styles.title}>Agentes GL</div>
            <div style={styles.subtitle}>Monitor de agentes WhatsApp</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {realtimeActive && (
            <div style={styles.realtime}>
              <span style={styles.realtimeDot} />
              Realtime ativo
            </div>
          )}
          <button onClick={fetchLogs} style={styles.refreshBtn}>↻ Atualizar</button>
        </div>
      </header>

      <div style={styles.body}>
        <Sidebar activeAgent={activeAgent} onSelect={setActiveAgent} />

        <div style={styles.content}>
          <div style={styles.agentHeader}>
            <div>
              <div style={styles.agentName}>{activeAgent?.name}</div>
              <div style={styles.agentDesc}>{activeAgent?.description}</div>
            </div>
            <AgentStatus agent={activeAgent} />
          </div>

          <div style={styles.tabs}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'logs' && (
            loading && logs.length === 0 ? (
              <div style={styles.loading}>Carregando logs…</div>
            ) : (
              <div style={styles.logsLayout}>
                <StatsCards logs={logs} />
                <div style={styles.grid2}>
                  <LogFeed logs={logs} loading={loading} />
                  <RestaurantesPanel logs={logs} />
                </div>
              </div>
            )
          )}

          {tab === 'playground' && activeAgent && (
            <div style={styles.playgroundWrap}>
              <Playground agent={activeAgent} />
            </div>
          )}

          {tab === 'validacao' && activeAgent && (
            <div style={styles.playgroundWrap}>
              <Validacao agent={activeAgent} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  header: { borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' },
  title: { fontWeight: 700, fontSize: 15 },
  subtitle: { color: 'var(--muted)', fontSize: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  realtime: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' },
  realtimeDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' },
  refreshBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  body: { display: 'flex', flex: 1, padding: '20px 24px', gap: 20, maxWidth: 1400, margin: '0 auto', width: '100%' },
  content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 },
  agentHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  agentName: { fontSize: 20, fontWeight: 700 },
  agentDesc: { fontSize: 13, color: 'var(--muted)', marginTop: 2 },
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 },
  tab: { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', padding: '8px 16px', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s', marginBottom: -1 },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  logsLayout: { display: 'flex', flexDirection: 'column', gap: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 },
  loading: { textAlign: 'center', color: 'var(--muted)', padding: 60 },
  playgroundWrap: { flex: 1, minHeight: 600 },
}
