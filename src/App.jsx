import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import AgentStatus from './components/AgentStatus.jsx'
import StatsCards from './components/StatsCards.jsx'
import LogFeed from './components/LogFeed.jsx'
import RestaurantesPanel from './components/RestaurantesPanel.jsx'

export default function App() {
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
      .subscribe(status => {
        setRealtimeActive(status === 'SUBSCRIBED')
      })

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

      <main style={styles.main}>
        <AgentStatus />

        {loading && logs.length === 0 ? (
          <div style={styles.loading}>Carregando logs…</div>
        ) : (
          <>
            <StatsCards logs={logs} />

            <div style={styles.grid2}>
              <LogFeed logs={logs} loading={loading} />
              <RestaurantesPanel logs={logs} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

const styles = {
  root: { minHeight: '100vh', background: 'var(--bg)' },
  header: { borderBottom: '1px solid var(--border)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { width: 38, height: 38, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff' },
  title: { fontWeight: 700, fontSize: 16 },
  subtitle: { color: 'var(--muted)', fontSize: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  realtime: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' },
  realtimeDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' },
  refreshBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  main: { maxWidth: 1280, margin: '0 auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  loading: { textAlign: 'center', color: 'var(--muted)', padding: 60 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 },
}
