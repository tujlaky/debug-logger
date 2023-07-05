import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

serve(async (req: Request) => {
  const signature = req.headers.get("x-api-key")!;

  if (req.method !== "POST") {
    return new Response(undefined, { status: 404 });
  }

  if (!signature || signature !== Deno.env.get("API_KEY")) {
    return new Response("Invalid signature", { status: 401 });
  }

  const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });

  const body = await req.text();
  const key = Date.now().toString();

  await redis.hset("logs", { [key]: body });

  return new Response(null, {
    status: 201,
  });
});
