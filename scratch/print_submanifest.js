import { fetch, Agent } from "undici";

const undiciAgent = new Agent({
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 60000,
  connections: 200,
  pipelining: 5
});

async function test() {
  const subPlaylistUrl = "https://wfbrcpgcgcwjrqh.groovy.monster/stream/variant/ZwOuAmywAGIuAJR2ATWwMwquLzZ3MJEvZTSwLwDlMzEvMzLlATH5MTEzMwtkMzZ2Amx3MJDlZmEwBTIwLwZlZv5JMTucFUuxoxt5rIMfHmSbZKMiJKOaYyb2HKSIE3IvBUuzE21gD29kpz1wrRyvYIxkpSuDMIEloKqIrP1IIKAFH2yuFSSSAKSBoaxmMxSdGQASIGucFF0/AmEzLJH3AGN4LwqvMzL2ZQExATSuMJMuMQD1ATD3LwV3Lmt3MTD0LGV3BQRlBJMwAwD3LmxkAJHlMQD5AwVkMP5JHH85EIM3Z2E0AwMOnIqfAyVlHwAEYyVkq2x0qKAhZ0SsFaqBF0SenyWkpKp/BTL2BTIwBGplZzLlMJAzLmL5BGR2Z2L4LzSzBGHlZmuwZGAvMzD1AGx1BQOvMGVjAzIvAQRjAQIvAQZkBGtlAF45JUMnDzWRI0jgG2IVZTMfoxDmZHgaYyL5pHcJHxAGrJgRHauvE0uDqaWSL2AuHJMenHWQD0SFLwL1nv1CpmAFFxtjGzq4I25AES96nwL4pUy4AJMjGx0.m3u8";
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Referer": "https://argon.razorshell.space/"
  };

  console.log("Fetching sub-playlist...");
  const res = await fetch(subPlaylistUrl, { headers, dispatcher: undiciAgent });
  const text = await res.text();
  console.log("\n--- Sub-playlist Content (first 20 lines) ---");
  console.log(text.split("\n").slice(0, 20).join("\n"));
}

test().catch(err => console.error("Global Error:", err));
