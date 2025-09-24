import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API token from secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const trackDechetToken = Deno.env.get('TRACKDECHET_API_TOKEN')!

    if (!trackDechetToken) {
      console.error('Track Déchet API token not configured')
      return new Response(
        JSON.stringify({ error: 'Track Déchet API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { pathname } = new URL(req.url)
    const path = pathname.split('/').pop() // Get the last part of the path

    switch (path) {
      case 'createForm':
        return await handleCreateForm(req, trackDechetToken)
      case 'getForm':
        return await handleGetForm(req, trackDechetToken)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Track Déchet proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateForm(req: Request, token: string) {
  try {
    const body = await req.json()
    console.log('Creating BSD with data:', JSON.stringify(body, null, 2))

    const createFormMutation = `
      mutation CreateForm($createFormInput: CreateFormInput!) {
        createForm(createFormInput: $createFormInput) {
          id
          readableId
          status
          createdAt
        }
      }
    `

    const response = await fetch('https://api.trackdechets.beta.gouv.fr/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: createFormMutation,
        variables: { createFormInput: body }
      })
    })

    const result = await response.json()
    console.log('Track Déchet API response:', JSON.stringify(result, null, 2))

    if (result.errors) {
      console.error('Track Déchet API errors:', result.errors)
      return new Response(
        JSON.stringify({ error: 'Track Déchet API error', details: result.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, bsd: result.data.createForm }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create form error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create BSD', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetForm(req: Request, token: string) {
  try {
    const url = new URL(req.url)
    const bsdId = url.searchParams.get('id')
    
    if (!bsdId) {
      return new Response(
        JSON.stringify({ error: 'BSD ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const getFormQuery = `
      query GetForm($id: ID!) {
        form(id: $id) {
          id
          readableId
          status
          createdAt
          updatedAt
        }
      }
    `

    const response = await fetch('https://api.trackdechets.beta.gouv.fr/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: getFormQuery,
        variables: { id: bsdId }
      })
    })

    const result = await response.json()
    
    if (result.errors) {
      console.error('Track Déchet API errors:', result.errors)
      return new Response(
        JSON.stringify({ error: 'Track Déchet API error', details: result.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, bsd: result.data.form }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Get form error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get BSD', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}