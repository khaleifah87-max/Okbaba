// @ts-nocheck — Deno edge function; compiled by Supabase CLI, not tsc
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, body, data } = await req.json()

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user's push token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'User not found', details: profileError.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile?.push_token) {
      return new Response(
        JSON.stringify({ error: 'No push token registered for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data: data || {},
        sound: 'default',
        badge: 1,
        priority: 'high',
      }),
    })

    const result = await expoResponse.json()

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[send-push-notification] Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})