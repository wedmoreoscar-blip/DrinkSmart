import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limit (resets on cold start). For real production traffic,
// move to a Postgres counter table or a managed rate limiter.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): {
  limited: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { limited: true, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return {
    limited: false,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetIn: record.resetTime - now,
  };
}

interface FeedbackRequest {
  title: string;
  description: string;
  image_url?: string | null;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const clientIP = getClientIP(req);
      const rateCheck = isRateLimited(clientIP);

      if (rateCheck.limited) {
        const resetMinutes = Math.ceil(rateCheck.resetIn / 60000);
        console.log(`Rate limited IP: ${clientIP}`);
        return jsonResponse(
          {
            error: "Too many feedback submissions. Please try again later.",
            resetIn: resetMinutes,
          },
          429
        );
      }

      const body: FeedbackRequest = await req.json();

      if (!body.title?.trim()) {
        return jsonResponse({ error: "Title is required" }, 400);
      }
      if (!body.description?.trim()) {
        return jsonResponse({ error: "Description is required" }, 400);
      }

      const title = body.title.trim().slice(0, 200);
      const description = body.description.trim().slice(0, 5000);
      const image_url = body.image_url ?? null;

      // user_id is taken from the verified JWT (ctx.userClaims), NOT from the
      // request body, so callers can't forge submissions as other users.
      // Anonymous users will have a real userClaims.id too.
      const userId = ctx.userClaims?.id ?? null;

      // Insert via the RLS-scoped client; the feedback table's INSERT policy
      // is `WITH CHECK (true)` so any authenticated user (anon or permanent)
      // can submit.
      const { data, error } = await ctx.supabase
        .from("feedback")
        .insert({
          title,
          description,
          image_url,
          user_id: userId,
          status: "new",
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting feedback:", error);
        return jsonResponse({ error: "Failed to submit feedback" }, 500);
      }

      console.log(`Feedback submitted by ${userId} from IP ${clientIP}, remaining: ${rateCheck.remaining}`);

      return jsonResponse({
        success: true,
        data,
        remaining: rateCheck.remaining,
      });
    } catch (err) {
      console.error("Error processing feedback:", err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }),
};
