import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";
import { Kafka } from "https://deno.land/x/kafkasaur@v0.0.7/index.ts";

serve(async (req: Request) => {
  const signature = req.headers.get("x-api-key")!;

  if (req.method !== "POST") {
    return new Response(undefined, { status: 404 });
  }

  if (!signature || signature !== Deno.env.get("API_KEY")) {
    return new Response("Invalid signature", { status: 401 });
  }

  const kafka = new Kafka({
    brokers: [Deno.env.get("UPSTASH_KAFKA_BROKER_URL")!],
    sasl: {
      mechanism: "scram-sha-256",
      username: Deno.env.get("UPSTASH_KAFKA_REST_USERNAME")!,
      password: Deno.env.get("UPSTASH_KAFKA_REST_PASSWORD")!,
    },
    ssl: true,
  });

  const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });

  const body = await req.text();
  const key = Date.now().toString();

  await redis.hset("logs", { [key]: body });

  const producer = kafka.producer();

  await producer.connect();

  await producer.send({
    topic: "logs",
    messages: [
      {
        key,
        value: body,
        headers: { "correlation-id": `${Date.now()}` },
      },
    ],
  });

  return new Response(null, {
    status: 201,
  });
});
