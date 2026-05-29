import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const systemPrompt = buildSystemPrompt(taskContext)

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

function buildSystemPrompt(ctx: Record<string, unknown>): string {
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
    lines.push('(The above instructions are the authoritative guide for this task type. Follow them closely.)')
  }

  const docs = ctx.howToDocs as string[] | undefined
  if (docs && docs.length > 0) {
    lines.push(`\nAttached how-to documents: ${docs.join(', ')}`)
    lines.push('These are reference documents the user has attached to this task. Refer to them by name when relevant.')
  }

  lines.push('\nAnswer questions clearly, give step-by-step guidance when helpful, and keep responses focused on this specific task.')

  return lines.join('\n')
}
