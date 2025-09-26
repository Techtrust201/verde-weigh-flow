// @ts-ignore - Edge Functions import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Force redeploy marker - version 3.0 
  console.log("🚀 Track Déchet Proxy v3.0 - Fixed URLs and TypeScript imports");

  try {
    // Get the API token from secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { pathname } = new URL(req.url);
    const path = pathname.split("/").pop(); // Get the last part of the path

    switch (path) {
      case "createForm":
        return await handleCreateForm(req);
      case "getForm":
        return await handleGetForm(req);
      case "validateToken":
        return await handleValidateToken(req);
      default:
        return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Track Déchet proxy error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCreateForm(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json();

    const userToken = body?.token;

    const sandboxFromQuery = url.searchParams.get("sandbox");
    const sandbox =
      typeof body?.sandbox === "boolean"
        ? body.sandbox
        : sandboxFromQuery === "true";

    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token manquant dans la requête",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retirer les clés sandbox/token du payload envoyé à GraphQL
    const { sandbox: _sandbox, token: _token, ...createFormInput } = body || {};

    console.log(
      "Creating BSD with data:",
      JSON.stringify(createFormInput, null, 2),
      "sandbox:",
      sandbox
    );

    const createFormMutation = `
      mutation CreateForm($createFormInput: CreateFormInput!) {
        createForm(createFormInput: $createFormInput) {
          id
          readableId
          status
          createdAt
        }
      }
    `;

    // Utiliser les URLs officielles selon la documentation Track Déchet
    const graphqlUrl = sandbox
      ? "https://api.sandbox.trackdechets.fr"
      : "https://api.trackdechets.fr";

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: createFormMutation,
        variables: { createFormInput },
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    let result: any = null;
    let rawText: string | undefined;

    if (contentType.includes("application/json")) {
      result = await response.json();
      console.log(
        "Track Déchet API response:",
        JSON.stringify(result, null, 2)
      );
    } else {
      rawText = await response.text();
      console.error(
        "Non-JSON response from Track Déchets (createForm):",
        response.status,
        rawText?.slice(0, 500)
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Track Déchet API error",
          details: result?.errors || rawText || `HTTP ${response.status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (result?.errors) {
      console.error("Track Déchet API errors:", result.errors);
      return new Response(
        JSON.stringify({
          error: "Track Déchet API error",
          details: result.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, bsd: result.data.createForm }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create form error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create BSD",
        details: (error as any)?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleGetForm(req: Request) {
  try {
    const url = new URL(req.url);
    let bsdId = url.searchParams.get("id");

    let body: any = undefined;
    try {
      body = await req.json();
    } catch (e) {
      /* ignore */
    }

    if (!bsdId && body?.id) {
      bsdId = body.id;
    }

    const sandboxFromQuery = url.searchParams.get("sandbox");
    const sandbox =
      typeof body?.sandbox === "boolean"
        ? body.sandbox
        : sandboxFromQuery === "true";

    const userToken = body?.token;
    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token manquant dans la requête",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bsdId) {
      return new Response(JSON.stringify({ error: "BSD ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    `;

    // Utiliser les URLs officielles selon la documentation Track Déchet
    const graphqlUrl = sandbox
      ? "https://api.sandbox.trackdechets.fr"
      : "https://api.trackdechets.fr";

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: getFormQuery,
        variables: { id: bsdId },
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    let result: any = null;
    let rawText: string | undefined;

    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      rawText = await response.text();
      console.error(
        "Non-JSON response from Track Déchets (getForm):",
        response.status,
        rawText?.slice(0, 500)
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Track Déchet API error",
          details: result?.errors || rawText || `HTTP ${response.status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (result?.errors) {
      console.error("Track Déchet API errors:", result.errors);
      return new Response(
        JSON.stringify({
          error: "Track Déchet API error",
          details: result.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, bsd: result.data.form }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get form error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get BSD",
        details: (error as any)?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleValidateToken(req: Request) {
  try {
    // Récupérer le token et le mode (sandbox) depuis le body / query
    const url = new URL(req.url);
    const body = await req.json();
    // TEST: Token sandbox en dur pour debug
    const userToken = "KuZwCgNTBtric3l4YgDUUVomxqJrEwtZ4ZVqSbJV";
    const sandbox = true; // Force sandbox pour le test

    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          isValid: false,
          errorType: "format",
          errorMessage: "Token manquant dans la requête",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validateQuery = `
      query {
        me {
          id
          email
          name
        }
      }
    `;

    // Utiliser les URLs officielles selon la documentation Track Déchet
    const graphqlUrl = sandbox
      ? "https://api.sandbox.trackdechets.fr"
      : "https://api.trackdechets.fr";

    console.log(
      "🔍 DEBUG: Using official Track Déchet URL:",
      graphqlUrl,
      "sandbox:",
      sandbox,
      "timestamp:",
      new Date().toISOString()
    );

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: validateQuery }),
    });

    console.log(
      "🔍 DEBUG validateToken: Track Déchet API response status:",
      response.status
    );

    const contentType = response.headers.get("content-type") || "";
    let result: any = null;
    let rawText: string | undefined;

    if (contentType.includes("application/json")) {
      result = await response.json();
      console.log(
        "🔍 DEBUG validateToken: Track Déchet API JSON response:",
        JSON.stringify(result, null, 2)
      );
    } else {
      rawText = await response.text();
      console.error(
        "Non-JSON response from Track Déchets (validateToken):",
        response.status,
        rawText?.slice(0, 500)
      );
    }

    if (!response.ok) {
      let errorType = "network";
      if (response.status === 401) errorType = "invalid_token";
      if (response.status === 403) errorType = "permissions";

      return new Response(
        JSON.stringify({
          success: false,
          isValid: false,
          errorType,
          errorMessage:
            result?.errors?.[0]?.message ||
            rawText ||
            `Erreur HTTP ${response.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (result?.errors) {
      console.error("Track Déchet validation errors:", result.errors);
      return new Response(
        JSON.stringify({
          success: false,
          isValid: false,
          errorType: "invalid_token",
          errorMessage: result.errors[0]?.message || "Token invalide",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "✅ DEBUG validateToken: Returning success with userInfo:",
      result?.data?.me
    );

    return new Response(
      JSON.stringify({
        success: true,
        isValid: true,
        userInfo: result?.data?.me,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validate token error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        isValid: false,
        errorType: "network",
        errorMessage: "Erreur de connexion",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
