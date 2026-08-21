import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const serverDir = join(distDir, "server");
const workerPath = join(serverDir, "index.js");

const worker = `const notFoundFallbackPaths = ["/index.html", "/"];

const fetchAsset = (request, env, path) => {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";

  return env.ASSETS.fetch(new Request(url, request));
};

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }

    const response = await env.ASSETS.fetch(request);

    if (response.status !== 404) {
      return response;
    }

    const accept = request.headers.get("accept") || "";

    if (!accept.includes("text/html")) {
      return response;
    }

    for (const path of notFoundFallbackPaths) {
      const fallback = await fetchAsset(request, env, path);

      if (fallback.status !== 404) {
        return fallback;
      }
    }

    return response;
  },
};
`;

await mkdir(serverDir, { recursive: true });
await writeFile(workerPath, worker);
