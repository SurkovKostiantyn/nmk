export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Маршрутизація
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          message: "Serverless Lab 15!",
          runtime: "Cloudflare Workers",
          timestamp: new Date().toISOString(),
          region: request.cf?.colo || "unknown",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname === "/echo" && request.method === "POST") {
      const body = await request.json();
      return new Response(JSON.stringify({ echo: body }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/env") {
      return new Response(
        JSON.stringify({
          APP_NAME: env.APP_NAME || "not set",
          ENVIRONMENT: env.ENVIRONMENT || "development",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    console.log(`Cron triggered at: ${new Date().toISOString()}`);
    console.log(`Cron expression: ${event.cron}`);
  },
};
