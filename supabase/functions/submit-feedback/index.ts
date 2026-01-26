import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (resets on function cold start)
// For production, consider using Redis or a database table
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // 5 submissions per hour per IP

function getClientIP(req: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }
  return "unknown";
}

function isRateLimited(ip: string): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetIn = record.resetTime - now;
    return { limited: true, remaining: 0, resetIn };
  }

  record.count++;
  return { 
    limited: false, 
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetIn: record.resetTime - now
  };
}

interface FeedbackRequest {
  title: string;
  description: string;
  image_url?: string | null;
  user_id?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateCheck = isRateLimited(clientIP);

    if (rateCheck.limited) {
      const resetMinutes = Math.ceil(rateCheck.resetIn / 60000);
      console.log(`Rate limited IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          error: "Too many feedback submissions. Please try again later.",
          resetIn: resetMinutes,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    const body: FeedbackRequest = await req.json();

    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.description || typeof body.description !== "string" || body.description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit field lengths
    const title = body.title.trim().slice(0, 200);
    const description = body.description.trim().slice(0, 5000);
    const image_url = body.image_url || null;
    const user_id = body.user_id || null;

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert feedback
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        title,
        description,
        image_url,
        user_id,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting feedback:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Feedback submitted from IP ${clientIP}, remaining: ${rateCheck.remaining}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        remaining: rateCheck.remaining 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing feedback:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
