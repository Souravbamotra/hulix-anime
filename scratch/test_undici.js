import { fetch, Agent } from "undici";

async function test() {
  console.log("Testing undici import...");
  const agent = new Agent({
    keepAliveTimeout: 10000,
    keepAliveMaxTimeout: 30000,
    connections: 100
  });

  const res = await fetch("https://www.google.com", {
    dispatcher: agent
  });
  console.log("Google response status:", res.status);
}

test().catch(err => console.error("Error:", err));
