/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
// @ts-ignore - Edge Functions import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

  // VERSION 12.1 - DEBUG TOKEN DYNAMIQUE
  console.log(
    "🚀 VERSION 12.1 - DEBUG TOKEN DYNAMIQUE " +
      new Date().toISOString() +
      " 🚀"
  );

  try {
    const { pathname } = new URL(req.url);
    const path = pathname.split("/").pop();

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
    const body = await req.json();

    // Extraire le token depuis le body de la requête
    const {
      token: userToken,
      sandbox: _sandbox,
      ...createFormInput
    } = body || {};

    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token API Track Déchet manquant",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // URL selon la documentation
    const graphqlUrl = "https://api.sandbox.trackdechets.beta.gouv.fr";

    console.log(
      "📤 Creating BSD with:",
      JSON.stringify(createFormInput, null, 2)
    );

    // Requête selon la doc : POST avec Authorization Bearer et Content-Type
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

    const result = await response.json();
    console.log("📥 Track Déchet response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Track Déchet API error",
          details: result?.errors || `HTTP ${response.status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (result?.errors) {
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

    // Extraire le token depuis le body de la requête
    const userToken = body?.token;

    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token API Track Déchet manquant",
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

    // URL selon la documentation
    const graphqlUrl = "https://api.sandbox.trackdechets.beta.gouv.fr";

    console.log("📤 Getting BSD:", bsdId);

    // Requête selon la doc
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

    const result = await response.json();
    console.log("📥 Track Déchet response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Track Déchet API error",
          details: result?.errors || `HTTP ${response.status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (result?.errors) {
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
    const body = await req.json();

    console.log("🔍 DEBUG: Body reçu:", JSON.stringify(body, null, 2));

    // Extraire le token depuis le body de la requête
    const userToken = body?.token;

    console.log("🔍 DEBUG: Token extrait:", userToken);

    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          isValid: false,
          errorType: "format",
          errorMessage: "Token API Track Déchet manquant",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query exacte de la documentation
    const validateQuery = `
      query {
        me {
          id
          email
          name
        }
      }
    `;

    // URL selon la documentation
    const graphqlUrl = "https://api.sandbox.trackdechets.beta.gouv.fr";

    console.log("🔍 Validating token with Track Déchet API");

    // Requête EXACTEMENT comme dans la doc
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: validateQuery }),
    });

    const result = await response.json();
    console.log("📥 Track Déchet response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          isValid: false,
          errorType: "network",
          errorMessage: `Erreur HTTP ${response.status}`,
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

    console.log("✅ Token validé avec succès:", result?.data?.me);

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
