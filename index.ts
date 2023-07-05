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

  const kafkaUrl = Deno.env.get("UPSTASH_KAFKA_REST_URL")!;
  const kafkaToken = Deno.env.get("UPSTASH_KAFKA_TOKEN")!;

  const response = await fetch(`${kafkaUrl}/produce/logs`, {
    headers: { Authorization: `Basic ${kafkaToken}` },
    method: "POST",
    body: JSON.stringify({
      key,
      value: body,
    }),
  });

  console.log(response);

  return new Response(null, {
    status: 201,
  });
});
