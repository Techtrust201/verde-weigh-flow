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

  // NOUVELLE VERSION - VERSION 6.0 - TOKEN EN DUR
  console.log(
    "🚀🚀🚀 NOUVELLE VERSION 6.0 - TOKEN EN DUR + BETA.GOUV.FR 🚀🚀🚀"
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

    // TOKEN EN DUR POUR TEST
    const userToken = "KuZwCgNTBtric3l4YgDUUVomxqJrEwtZ4ZVqSbJV";
    const sandbox = true;

    if (!userToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token manquant dans la requête",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sandbox: _sandbox, token: _token, ...createFormInput } = body || {};

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

    // URL CORRECTE
    const graphqlUrl = "https://api.sandbox.trackdechets.beta.gouv.fr";

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
    } else {
      rawText = await response.text();
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

    // TOKEN EN DUR POUR TEST
    const userToken = "KuZwCgNTBtric3l4YgDUUVomxqJrEwtZ4ZVqSbJV";
    const sandbox = true;

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

    // URL CORRECTE
    const graphqlUrl = "https://api.sandbox.trackdechets.beta.gouv.fr";

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
    // TOKEN EN DUR POUR TEST
    const userToken = "KuZwCgNTBtric3l4YgDUUVomxqJrEwtZ4ZVqSbJV";
    const sandbox = true;

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

    // URL CORRECTE
    const graphqlUrl = "https://api.sandbox.trackdechets.beta.gouv.fr";

    console.log(
      "🔍 DEBUG: Using CORRECT URL:",
      graphqlUrl,
      "sandbox:",
      sandbox
    );

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: validateQuery }),
    });

    console.log("🔍 DEBUG: Response status:", response.status);

    const contentType = response.headers.get("content-type") || "";
    let result: any = null;
    let rawText: string | undefined;

    if (contentType.includes("application/json")) {
      result = await response.json();
      console.log("🔍 DEBUG: JSON response:", JSON.stringify(result, null, 2));
    } else {
      rawText = await response.text();
      console.error(
        "Non-JSON response:",
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

    console.log("✅ SUCCESS: Returning userInfo:", result?.data?.me);

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
