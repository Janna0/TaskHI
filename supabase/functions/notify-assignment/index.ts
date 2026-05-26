import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task_id, assignee_id, assigner_name } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const [{ data: assignee }, { data: task }] = await Promise.all([
      supabase.from('profiles').select('email, name').eq('id', assignee_id).single(),
      supabase.from('tasks').select('title, project_id').eq('id', task_id).single(),
    ])

    if (!assignee?.email || !task) {
      return new Response(JSON.stringify({ error: 'Missing data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', task.project_id)
      .single()

    const recipientName = assignee.name ?? assignee.email.split('@')[0]
    const projectName = project?.name ?? 'a project'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'TaskHI <onboarding@resend.dev>',
        to: [assignee.email],
        subject: `You've been assigned: ${task.title}`,
        html: `
          <div style="font-family: Inter, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; color: #1e293b;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 22px; font-weight: 700; color: #6366f1;">TaskHI</span>
            </div>
            <p style="font-size: 15px; margin: 0 0 8px;">Hi ${recipientName},</p>
            <p style="font-size: 15px; color: #475569; margin: 0 0 24px;">
              <strong style="color: #1e293b;">${assigner_name}</strong> assigned you to a task in
              <strong style="color: #1e293b;">${projectName}</strong>.
            </p>
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 6px; margin-bottom: 32px;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${task.title}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              You’re receiving this email because you were assigned to a task in TaskHI.
            </p>
          </div>
        `,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
