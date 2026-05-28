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
    const { assignee_email, assignee_name, task_title, project_name, assigned_by_name } = await req.json()

    if (!assignee_email || !task_title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'TaskHI <onboarding@resend.dev>',
        to: [assignee_email],
        subject: `You've been assigned: ${task_title}`,
        html: `
          <div style="font-family: Inter, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; color: #1e293b;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 22px; font-weight: 700; color: #6366f1;">TaskHI</span>
            </div>
            <p style="font-size: 15px; margin: 0 0 8px;">Hi ${assignee_name},</p>
            <p style="font-size: 15px; color: #475569; margin: 0 0 24px;">
              <strong style="color: #1e293b;">${assigned_by_name}</strong> assigned you to a task in
              <strong style="color: #1e293b;">${project_name}</strong>.
            </p>
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 6px; margin-bottom: 32px;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${task_title}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              You're receiving this email because you were assigned to a task in TaskHI.
            </p>
          </div>
        `,
      }),
    })

    return new Response(JSON.stringify({ ok: res.ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
