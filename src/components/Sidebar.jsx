import React from 'react'
import { AGENTS } from '../lib/config.js'

export default function Sidebar({ activeAgent, onSelect }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.section}>AGENTES</div>
      {AGENTS.map(agent => {
        const isActive = activeAgent?.id === agent.id
        return (
          <button
            key={agent.id}
            onClick={() => agent.active && onSelect(agent)}
            style={{
              ...styles.item,
              ...(isActive ? styles.itemActive : {}),
              ...(agent.active ? {} : styles.itemDisabled),
            }}
            title={agent.active ? agent.description : 'Em breve'}
          >
            <div style={{ ...styles.dot, background: agent.color, opacity: agent.active ? 1 : 0.3 }} />
            <div style={styles.itemText}>
              <div style={styles.itemName}>{agent.name}</div>
              <div style={styles.itemDesc}>{agent.description}</div>
            </div>
            {!agent.active && <span style={styles.soon}>soon</span>}
            {agent.active && isActive && <span style={{ ...styles.activeDot, background: agent.color }} />}
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  sidebar: { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8 },
  section: { fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', padding: '0 12px 8px', textTransform: 'uppercase' },
  item: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' },
  itemActive: { background: 'var(--surface2)', border: '1px solid var(--border)' },
  itemDisabled: { cursor: 'default', opacity: 0.5 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  itemText: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  itemDesc: { fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  soon: { fontSize: 10, background: 'var(--surface2)', color: 'var(--muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 },
  activeDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
}
