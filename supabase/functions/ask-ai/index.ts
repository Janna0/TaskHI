import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_DOC_CHARS = 30000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, taskContext } = await req.json()

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY as a Supabase secret.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download and read how-to documents
    const howToDocUrls = (taskContext.howToDocUrls ?? []) as { name: string; url: string }[]
    const docContents: { name: string; text: string }[] = []
    for (const { name, url } of howToDocUrls) {
      const text = await readDocument(url, name)
      if (text) docContents.push({ name, text })
    }

    const systemPrompt = buildSystemPrompt(taskContext, docContents)

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages ?? []),
        ],
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      return new Response(errText, {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      })
    }

    return new Response(openaiRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function readDocument(url: string, name: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    const bytes = new Uint8Array(await res.arrayBuffer())
    const lower = name.toLowerCase()

    if (lower.endsWith('.pdf')) {
      return await readPdf(bytes, name)
    }

    // Plain text, markdown, csv, etc.
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return smartTruncate(text)
  } catch {
    return ''
  }
}

async function readPdf(bytes: Uint8Array, name: string): Promise<string> {
  // Try unpdf (pdfjs-based, works in Deno)
  try {
    const { getDocumentProxy, extractText } = await import('npm:unpdf')
    const pdf = await getDocumentProxy(bytes)
    const { text } = await extractText(pdf, { mergePages: true })
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (cleaned.length > 50) return cleaned.slice(0, MAX_DOC_CHARS)
  } catch { /* fall through */ }

  // Fallback: regex extraction for uncompressed PDFs
  const raw = new TextDecoder('latin1').decode(bytes)
  const parts: string[] = []
  const re = /\(([^()\\]{2,400})\)\s*(?:Tj|'|")/g
  let m
  while ((m = re.exec(raw)) !== null) {
    const t = m[1]
      .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
      .trim()
    if (t.length > 2 && /[a-zA-Z]/.test(t)) parts.push(t)
  }
  if (parts.length > 30) {
    return smartTruncate(parts.join(' ').replace(/\s+/g, ' ').trim())
  }

  return `[The PDF "${name}" is attached but its text could not be extracted automatically. Ask the user to paste the relevant section or describe the content.]`
}

function smartTruncate(text: string): string {
  if (text.length <= MAX_DOC_CHARS) return text
  // Cut at a paragraph or sentence boundary to avoid mid-sentence truncation
  const cutoff = text.lastIndexOf('\n\n', MAX_DOC_CHARS)
  const cutoff2 = text.lastIndexOf('. ', MAX_DOC_CHARS)
  const cut = cutoff > MAX_DOC_CHARS * 0.8 ? cutoff : cutoff2 > MAX_DOC_CHARS * 0.8 ? cutoff2 + 1 : MAX_DOC_CHARS
  return text.slice(0, cut) + '\n\n[Document continues — content above covers the main sections]'
}

function buildSystemPrompt(ctx: Record<string, unknown>, docContents: { name: string; text: string }[]): string {
  const lines = [
    'You are a helpful AI assistant embedded in a task management app called TaskHI.',
    'Help the user understand and complete the task described below. Be concise and practical.',
    '',
    `Task: ${ctx.title}`,
  ]

  if (ctx.phase) lines.push(`Phase: ${ctx.phase}`)
  if (ctx.competency) lines.push(`Competency level: ${ctx.competency}`)
  if (ctx.time_required) lines.push(`Time required: ${ctx.time_required}`)
  if (ctx.notes) lines.push(`\nDescription:\n${ctx.notes}`)

  if (ctx.templateInstructions) {
    lines.push(`\n## Skill Instructions\n${ctx.templateInstructions}`)
    lines.push('(The above are authoritative instructions for this task type. Follow them closely.)')
  }

  if (docContents.length > 0) {
    lines.push('\n## How-To Documents (full content below)')
    for (const doc of docContents) {
      lines.push(`\n### ${doc.name}\n${doc.text}`)
    }
    lines.push('\nBase your answers on the document content above. Quote specific parts when helpful.')
  }

  lines.push('\nAnswer questions clearly, give step-by-step guidance when helpful, and keep responses focused on this specific task.')
  return lines.join('\n')
}
