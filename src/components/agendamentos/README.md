# Agendamentos — Frontend

Componente React para gerenciar o módulo de mensagens agendadas.
Localização: `src/components/agendamentos/`

---

## Estrutura

```
agendamentos/
├── Agendamentos.jsx   — wrapper: 4 tabs + sistema de toast
├── Eventos.jsx        — CRUD eventos, preview dinâmico, detalhe de mensagens
├── Templates.jsx      — CRUD templates, itens dinâmicos, chips de variáveis
├── Grupos.jsx         — CRUD grupos WhatsApp
├── Fila.jsx           — fila de mensagens, filtros, editar/cancelar/retry
└── README.md          — este arquivo
```

**Cliente API:** `src/lib/scheduler-api.js`
- `createSchedulerApi(baseUrl)` — factory, retorna todas as funções de API
- Helpers client-side: `renderTemplate`, `buildContext`, `computeSendAt`, `previewMessages`, `formatInSP`

---

## Como adicionar um novo `kind` de item de template

1. **Backend primeiro** — ver `modules/scheduler/README.md → Adicionar novos kinds`.

2. **`scheduler-api.js`** — adicionar em `KIND_LABEL`:
   ```js
   export const KIND_LABEL = {
     // ...existentes...
     meu_kind: 'Minha descrição',
   }
   ```

3. **`Templates.jsx`** — adicionar em `KIND_OPTIONS`:
   ```js
   const KIND_OPTIONS = [
     // ...existentes...
     { value: 'meu_kind', label: 'Minha descrição' },
   ]
   ```

---

## Como adicionar uma nova variável de template (ex: `{tutor}`)

1. **Backend primeiro** — popular a variável em `service.py → _generate_messages`.

2. **`scheduler-api.js`** — adicionar em `buildContext`:
   ```js
   export function buildContext(nomeEvento, startsAt, link, extras = {}) {
     return {
       nome_evento: nomeEvento,
       data, hora, link,
       tutor: extras.tutor || '{tutor}',  // ← adicionar
       ...
     }
   }
   ```

3. **`Templates.jsx`** — adicionar no array `VARS` (chips clicáveis):
   ```js
   const VARS = ['{nome_evento}', '{data}', '{hora}', '{link}', '{tutor}']
   ```

4. **`Eventos.jsx`** — se a variável vier de um campo do formulário (não de `variaveis_extras`),
   adicionar o campo no form e passá-lo para `previewMessages` via `extras`.

---

## Boas práticas

- **Não usar `useEffect` para computar o preview** — o preview é derivado direto no render
  a partir dos campos do form (`const preview = modal ? previewMessages(...) : []`),
  garantindo atualização a cada tecla sem dependências stale.

- **Toast centralizado** — `showToast(mensagem, tipo)` vive em `Agendamentos.jsx` e é
  passado como prop para todos os filhos. Não criar estados de toast locais.

- **Modais como overlays simples** — position:fixed + rgba background, sem biblioteca
  externa. Clicar fora fecha (onClick no overlay, stopPropagation no panel).

- **Sem react-router** — toda navegação é por `useState` local. Não introduzir router.

- **Estilos** — `const s = {...}` no final de cada arquivo, usando CSS vars do tema
  (`var(--accent)`, `var(--border)`, etc.). Não usar Tailwind nem shadcn/ui.
