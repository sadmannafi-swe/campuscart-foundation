// Packages the Vite SPA + Express API in Vercel's Build Output API v3 format:
//   .vercel/output/static/            ← dist/ (SPA)
//   .vercel/output/functions/api.func ← bundled Express app (Node.js)
// All /api/* requests go to the function; everything else falls back to index.html.
import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const out = ".vercel/output";
const fn = path.join(out, "functions/api.func");

await rm(out, { recursive: true, force: true });
await mkdir(fn, { recursive: true });
await cp("dist", path.join(out, "static"), { recursive: true });

await build({
  entryPoints: ["server/vercel.ts"],
  outfile: path.join(fn, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  // Optional native/cloud add-ons of the MongoDB driver that we don't use.
  external: [
    "kerberos",
    "@mongodb-js/zstd",
    "snappy",
    "socks",
    "aws4",
    "mongodb-client-encryption",
    "gcp-metadata",
    "@aws-sdk/credential-providers",
  ],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
});

await writeFile(
  path.join(fn, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      maxDuration: 30,
    },
    null,
    2,
  ),
);
await writeFile(path.join(fn, "package.json"), JSON.stringify({ type: "module" }));

await writeFile(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        { src: "^/api(/.*)?$", dest: "/api" },
        { handle: "filesystem" },
        { src: "^/(.*)$", dest: "/index.html" },
      ],
      crons: [{ path: "/api/cron/order-emails", schedule: "17 3 * * *" }],
    },
    null,
    2,
  ),
);
console.log("✓ Vercel build output written to .vercel/output");
