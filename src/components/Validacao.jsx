import React, { useState, useEffect, useRef } from 'react'

const TEST_TOKEN = import.meta.env.VITE_TEST_SECRET || ''

const ALERTA_COLOR = {
  alto:   { bg: 'var(--yellow-dim)', color: 'var(--yellow)' },
  baixo:  { bg: 'var(--blue-dim)',   color: 'var(--blue)'   },
  nenhum: { bg: '#ffffff08',         color: 'var(--muted)'  },
}

const TIPO_COLOR = {
  anotacao: { bg: 'var(--blue-dim)',   color: 'var(--blue)'   },
  status:   { bg: 'var(--accent-dim)', color: 'var(--accent)' },
  alerta:   { bg: 'var(--yellow-dim)', color: 'var(--yellow)' },
  ignorar:  { bg: '#ffffff08',         color: 'var(--muted)'  },
}

export default function Validacao({ agent }) {
  const [mentorados, setMentorados]     = useState([])
  const [loadingList, setLoadingList]   = useState(true)
  const [selected, setSelected]         = useState('')
  const [message, setMessage]           = useState('')
  const [dryRun, setDryRun]             = useState(true)
  const [loading, setLoading]           = useState(false)
  const [results, setResults]           = useState([])
  const [stressN, setStressN]           = useState(3)
  const [stressMode, setStressMode]     = useState('single')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMentorados()
  }, [agent.url])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [results])

  async function loadMentorados() {
    setLoadingList(true)
    try {
      const r = await fetch(`${agent.url}/mentorados`, {
        headers: { 'X-Test-Token': TEST_TOKEN },
      })
      if (r.ok) {
        const data = await r.json()
        setMentorados(data)
        if (data.length > 0) setSelected(data[0].id)
      } else {
        console.error('mentorados fetch error', r.status, await r.text())
      }
    } catch (err) {
      console.error('mentorados fetch failed', err)
    }
    setLoadingList(false)
  }

  function addResult(res) {
    setResults(prev => [{ ...res, _ts: Date.now() }, ...prev])
  }

  async function runSingle(mentoradoId, msg, label) {
    const r = await fetch(`${agent.url}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Test-Token': TEST_TOKEN },
      body: JSON.stringify({ mentorado_id: mentoradoId, message: msg, dry_run: dryRun }),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return { ...(await r.json()), _label: label }
  }

  async function handleValidate() {
    if (!selected || !message.trim() || loading) return
    setLoading(true)
    const msg = message.trim()

    try {
      if (stressMode === 'single') {
        const nome = mentorados.find(m => m.id === selected)?.nome || selected
        const res = await runSingle(selected, msg, nome)
        addResult(res)

      } else if (stressMode === 'buffer') {
        const nome = mentorados.find(m => m.id === selected)?.nome || selected
        const promises = Array.from({ length: stressN }, (_, i) =>
          runSingle(selected, `${msg} (msg ${i + 1}/${stressN})`, `${nome} #${i + 1}`)
        )
        const all = await Promise.allSettled(promises)
        all.forEach(r => {
          if (r.status === 'fulfilled') addResult(r.value)
          else addResult({ _label: 'erro', error: r.reason?.message })
        })

      } else if (stressMode === 'parallel') {
        const ativos = mentorados.filter(m => m.agente_ativo).slice(0, stressN)
        const promises = ativos.map(m => runSingle(m.id, msg, m.nome))
        const all = await Promise.allSettled(promises)
        all.forEach(r => {
          if (r.status === 'fulfilled') addResult(r.value)
          else addResult({ _label: 'erro', error: r.reason?.message })
        })
      }
    } catch (err) {
      addResult({ _label: 'erro', error: err.message })
    }

    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleValidate() }
  }

  const selectedMentorado = mentorados.find(m => m.id === selected)

  return (
    <div style={s.root}>

      {/* Painel esquerdo — configuração */}
      <div style={s.panel}>
        <div style={s.panelTitle}>Configuração</div>

        <label style={s.label}>Mentorado</label>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={s.select}
          disabled={loadingList}
        >
          <option value="">{loadingList ? 'Carregando…' : mentorados.length === 0 ? 'Nenhum encontrado' : 'Selecione…'}</option>
          {mentorados.map(m => (
            <option key={m.id} value={m.id}>
              {m.nome}{m.agente_ativo ? ' ●' : ''} — {m.tutor || '—'}
            </option>
          ))}
        </select>

        {selectedMentorado && (
          <div style={s.statusGrid}>
            {['contrato','pagamento','onboarding','tarefas','implementacao','tarefas_pos','ativo_tutorias','saude_financeira'].map(k => (
              <div key={k} style={s.statusItem}>
                <span style={s.statusKey}>{k.replace('_', ' ')}</span>
                <span style={s.statusVal}>{selectedMentorado[k] || '—'}</span>
              </div>
            ))}
          </div>
        )}

        <label style={s.label}>Modo de disparo</label>
        <div style={s.modeRow}>
          {[
            { id: 'single',   label: 'Single', hint: '1 mensagem' },
            { id: 'buffer',   label: 'Buffer',   hint: 'N rápidas' },
            { id: 'parallel', label: 'Parallel', hint: 'N grupos' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setStressMode(m.id)}
              style={{ ...s.modeBtn, ...(stressMode === m.id ? s.modeBtnActive : {}) }}
              title={m.hint}
            >
              {m.label}
            </button>
          ))}
        </div>

        {stressMode !== 'single' && (
          <div style={s.nRow}>
            <label style={s.label}>
              {stressMode === 'buffer' ? 'Msgs simultâneas' : 'Mentorados ativos'}
            </label>
            <input
              type="number"
              min={2}
              max={20}
              value={stressN}
              onChange={e => setStressN(Number(e.target.value))}
              style={s.nInput}
            />
          </div>
        )}

        {stressMode === 'buffer' && (
          <div style={s.hint}>
            Dispara {stressN} mensagens simultâneas para o mesmo mentorado.
            O buffer do agente deve consolidar em 1 único registro.
          </div>
        )}
        {stressMode === 'parallel' && (
          <div style={s.hint}>
            Dispara a mesma mensagem para os primeiros {stressN} mentorados ativos ao mesmo tempo.
          </div>
        )}

        <div style={s.dryRow}>
          <input
            type="checkbox"
            id="dryrun"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
          />
          <label htmlFor="dryrun" style={s.dryLabel}>
            Dry run (não grava no banco)
          </label>
        </div>

        <button
          onClick={() => setResults([])}
          style={s.clearBtn}
        >
          Limpar resultados
        </button>
      </div>

      {/* Área principal — input + resultados */}
      <div style={s.main}>
        <div style={s.inputArea}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Simule uma mensagem do grupo… Ex: batemos R$45k essa semana, CMV caiu para 27%"
            style={s.textarea}
            rows={3}
            disabled={loading}
          />
          <button
            onClick={handleValidate}
            disabled={loading || !message.trim() || !selected}
            style={{ ...s.sendBtn, opacity: (loading || !message.trim() || !selected) ? 0.5 : 1 }}
          >
            {loading ? '…' : 'Validar'}
          </button>
        </div>

        <div style={s.feed}>
          {results.length === 0 && (
            <div style={s.empty}>
              Nenhuma validação ainda. Configure acima e dispare uma mensagem.
            </div>
          )}

          {results.map((res, i) => (
            <ResultCard key={res._ts || i} result={res} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false)

  if (result.error) {
    return (
      <div style={{ ...s.card, borderColor: 'var(--red, #f85149)' }}>
        <div style={s.cardHeader}>
          <span style={{ color: 'var(--red, #f85149)', fontWeight: 700 }}>ERRO</span>
          <span style={s.cardLabel}>{result._label || '—'}</span>
        </div>
        <div style={s.cardBody}>{result.error}</div>
      </div>
    )
  }

  const d = result.decisao || {}
  const gravou = result.gravou
  const dry = result.dry_run
  const nome = result.mentorado?.nome || result._label || '—'
  const tipo = d.tipo || 'ignorar'
  const alerta = d.nivel_alerta || 'nenhum'
  const tipoStyle = TIPO_COLOR[tipo] || TIPO_COLOR.ignorar
  const alertaStyle = ALERTA_COLOR[alerta] || ALERTA_COLOR.nenhum

  return (
    <div style={s.card}>
      <div style={s.cardHeader} onClick={() => setExpanded(v => !v)}>
        <div style={s.cardHeaderLeft}>
          <span style={{ ...s.badge, background: tipoStyle.bg, color: tipoStyle.color }}>{tipo}</span>
          <span style={{ ...s.badge, background: alertaStyle.bg, color: alertaStyle.color }}>
            alerta: {alerta}
          </span>
          {dry && <span style={{ ...s.badge, background: '#ffffff0a', color: 'var(--muted)' }}>dry run</span>}
          {!dry && gravou && <span style={{ ...s.badge, background: 'var(--green-dim, #12261e)', color: 'var(--green)' }}>gravou</span>}
          {!dry && !gravou && d.deve_registrar === false && <span style={{ ...s.badge, background: '#ffffff0a', color: 'var(--muted)' }}>ignorado</span>}
        </div>
        <div style={s.cardName}>{nome}</div>
        <div style={s.expandHint}>{expanded ? '▲' : '▼'}</div>
      </div>

      {d.resumo && <div style={s.resumo}>{d.resumo}</div>}

      {Object.keys(result.updated_fields || {}).length > 0 && (
        <div style={s.diffRow}>
          {Object.entries(result.updated_fields).map(([k, v]) => (
            <div key={k} style={s.diffItem}>
              <span style={s.diffKey}>{k}</span>
              <span style={s.diffBefore}>{v.before || '—'}</span>
              <span style={s.diffArrow}>→</span>
              <span style={s.diffAfter}>{v.after}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <pre style={s.json}>
          {JSON.stringify({ decisao: d, state_before: result.state_before }, null, 2)}
        </pre>
      )}
    </div>
  )
}

const s = {
  root: { display: 'flex', gap: 20, height: '100%', minHeight: 600 },

  panel: { width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 },
  panelTitle: { fontWeight: 700, fontSize: 14, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 2 },
  select: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 10px', color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none' },
  hint: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 },

  statusGrid: { display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--surface2)',
    borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' },
  statusItem: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 },
  statusKey: { color: 'var(--muted)', textTransform: 'lowercase' },
  statusVal: { color: 'var(--text)', fontWeight: 600, textAlign: 'right', maxWidth: 120,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  modeRow: { display: 'flex', gap: 6 },
  modeBtn: { flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
    padding: '6px 4px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  modeBtnActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },

  nRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  nInput: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '6px 10px', color: 'var(--text)', fontSize: 13, width: 80, outline: 'none' },

  dryRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  dryLabel: { fontSize: 13, color: 'var(--text)', cursor: 'pointer' },
  clearBtn: { marginTop: 'auto', background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif' },

  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  inputArea: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: { flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '12px 14px', color: 'var(--text)', fontSize: 13, resize: 'none', outline: 'none',
    fontFamily: 'Inter, sans-serif', lineHeight: 1.5 },
  sendBtn: { height: 44, padding: '0 20px', borderRadius: 8, background: 'var(--accent)', border: 'none',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
    fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' },

  feed: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { textAlign: 'center', color: 'var(--muted)', padding: 60, fontSize: 13 },

  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
    cursor: 'pointer', borderBottom: '1px solid var(--border)' },
  cardHeaderLeft: { display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' },
  cardName: { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginLeft: 'auto', flexShrink: 0 },
  expandHint: { fontSize: 11, color: 'var(--muted)', marginLeft: 4 },
  badge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
    textTransform: 'uppercase', letterSpacing: '0.04em' },
  resumo: { padding: '10px 16px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
    borderBottom: '1px solid var(--border)' },
  diffRow: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 16px',
    borderBottom: '1px solid var(--border)' },
  diffItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' },
  diffKey: { color: 'var(--muted)', fontWeight: 600 },
  diffBefore: { color: 'var(--muted)', textDecoration: 'line-through' },
  diffArrow: { color: 'var(--muted)' },
  diffAfter: { color: 'var(--green)', fontWeight: 700 },
  cardBody: { padding: '12px 16px', fontSize: 13 },
  json: { margin: 0, padding: '12px 16px', fontSize: 12, color: 'var(--muted)',
    background: '#0d1117', overflowX: 'auto', fontFamily: 'JetBrains Mono, monospace',
    borderTop: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' },
}
