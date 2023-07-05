import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis/mod.ts";
import { Kafka } from "npm:@upstash/kafka";

serve(async (req: Request) => {
  const signature = req.headers.get("x-api-key")!;

  if (!signature || signature !== Deno.env.get("API_KEY")) {
    return new Response("Invalid signature", { status: 401 });
  }

  const kafka = new Kafka({
    url: Deno.env.get("UPSTASH_KAFKA_REST_URL")!,
    username: Deno.env.get("UPSTASH_KAFKA_REST_USERNAME")!,
    password: Deno.env.get("UPSTASH_KAFKA_REST_PASSWORD")!,
  });

  const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });

  const body = await req.text();
  const key = Date.now().toString();

  await redis.hset("logs", { [key]: body });

  const producer = kafka.producer();

  await producer.produce("logs", body);

  return new Response(null, {
    status: 201,
  });
});
