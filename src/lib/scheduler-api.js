/**
 * Cliente API do scheduler.
 * Fonte de verdade de tipos: modules/scheduler/schemas.py no backend.
 *
 * Uso: const api = createSchedulerApi(agent.url)
 */

const SP_TZ = 'America/Sao_Paulo'

// --------------------------------------------------------------------------
// HTTP base
// --------------------------------------------------------------------------

async function apiFetch(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { detail = (await res.json()).detail || detail } catch (_) {}
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

// --------------------------------------------------------------------------
// Factory
// --------------------------------------------------------------------------

export function createSchedulerApi(baseUrl) {
  const f = (path, opts) => apiFetch(baseUrl, path, opts)

  return {
    // Groups
    listGroups:   ()         => f('/scheduler/groups'),
    createGroup:  (data)     => f('/scheduler/groups',         { method: 'POST',   body: data }),
    updateGroup:  (id, data) => f(`/scheduler/groups/${id}`,   { method: 'PATCH',  body: data }),
    deleteGroup:  (id)       => f(`/scheduler/groups/${id}`,   { method: 'DELETE' }),

    // Templates
    listTemplates:   ()         => f('/scheduler/templates'),
    getTemplate:     (id)       => f(`/scheduler/templates/${id}`),
    createTemplate:  (data)     => f('/scheduler/templates',       { method: 'POST',   body: data }),
    updateTemplate:  (id, data) => f(`/scheduler/templates/${id}`, { method: 'PATCH',  body: data }),
    deleteTemplate:  (id)       => f(`/scheduler/templates/${id}`, { method: 'DELETE' }),

    // Events
    listEvents:  (status)    => f(`/scheduler/events${status ? `?status=${status}` : ''}`),
    getEvent:    (id)        => f(`/scheduler/events/${id}`),
    createEvent: (data)      => f('/scheduler/events',         { method: 'POST',  body: data }),
    updateEvent: (id, data)  => f(`/scheduler/events/${id}`,   { method: 'PATCH', body: data }),
    cancelEvent: (id)        => f(`/scheduler/events/${id}/cancel`, { method: 'POST' }),

    // Messages
    listMessages: (params = {}) => {
      const q = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => v != null && q.set(k, v))
      return f(`/scheduler/messages?${q}`)
    },
    updateMessage: (id, data) => f(`/scheduler/messages/${id}`,        { method: 'PATCH', body: data }),
    cancelMessage: (id)       => f(`/scheduler/messages/${id}/cancel`,  { method: 'POST' }),
    retryMessage:  (id)       => f(`/scheduler/messages/${id}/retry`,   { method: 'POST' }),
  }
}

// --------------------------------------------------------------------------
// Client-side template rendering (espelha modules/scheduler/templates.py)
// --------------------------------------------------------------------------

export function renderTemplate(body, context) {
  return body.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? `{${key}}`)
}

export function buildContext(nomeEvento, startsAt, link, extras = {}) {
  const dt = new Date(startsAt)
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone: SP_TZ, day: '2-digit', month: '2-digit' }).format(dt)
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: SP_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(dt)
  return {
    nome_evento: nomeEvento,
    data,
    hora,
    link,
    ...Object.fromEntries(Object.entries(extras).map(([k, v]) => [k, String(v)])),
  }
}

export function computeSendAt(startsAt, offsetMinutes) {
  return new Date(new Date(startsAt).getTime() + offsetMinutes * 60 * 1000)
}

export function previewMessages(itens, nomeEvento, startsAt, link, extras = {}) {
  if (!itens?.length || !startsAt) return []
  // Campos não preenchidos mostram a variável literal no preview (ex: "{link}")
  const ctx = buildContext(
    nomeEvento || '{nome_evento}',
    startsAt,
    link || '{link}',
    extras,
  )
  return [...itens]
    .sort((a, b) => a.offset_minutes - b.offset_minutes)
    .map(item => ({
      kind: item.kind,
      offset_minutes: item.offset_minutes,
      send_at: computeSendAt(startsAt, item.offset_minutes),
      message_text: renderTemplate(item.message_body, ctx),
      ordem: item.ordem ?? 0,
    }))
}

// --------------------------------------------------------------------------
// Formatting helpers
// --------------------------------------------------------------------------

export function formatInSP(isoOrDate, fmt = 'datetime') {
  const dt = new Date(isoOrDate)
  const opts = { timeZone: SP_TZ }
  if (fmt === 'date')     return new Intl.DateTimeFormat('pt-BR', { ...opts, day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt)
  if (fmt === 'time')     return new Intl.DateTimeFormat('pt-BR', { ...opts, hour: '2-digit', minute: '2-digit', hour12: false }).format(dt)
  if (fmt === 'datetime') return new Intl.DateTimeFormat('pt-BR', { ...opts, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(dt)
  return dt.toISOString()
}

/** Converte datetime-local "YYYY-MM-DDTHH:mm" → ISO com offset SP "-03:00" */
export function localToSpIso(localStr) {
  if (!localStr) return null
  return `${localStr}:00-03:00`
}

/** Converte ISO UTC → string "YYYY-MM-DDTHH:mm" para preencher datetime-local em hora SP */
export function isoToLocalSP(isoStr) {
  if (!isoStr) return ''
  const dt = new Date(isoStr)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: SP_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(dt).replace(' ', 'T')
}

export function eventStatus(event) {
  if (event.cancelled_at) return 'cancelled'
  const now = Date.now()
  const starts = new Date(event.starts_at).getTime()
  const diff = (starts - now) / 60000
  if (diff > 30)  return 'upcoming'
  if (diff >= -30) return 'live'
  return 'past'
}

export const STATUS_LABEL = {
  upcoming:   'Próximo',
  live:       'Ao vivo',
  past:       'Passado',
  cancelled:  'Cancelado',
  pending:    'Pendente',
  processing: 'Processando',
  sent:       'Enviado',
  failed:     'Falhou',
}

export const KIND_LABEL = {
  d_minus_1:      'D-1',
  one_hour_before:'1h antes',
  at_time:        'Na hora',
  d_plus_1:       'D+1',
  custom:         'Customizado',
}
