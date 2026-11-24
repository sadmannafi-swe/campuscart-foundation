// Packages the Vite SPA + Express API in Vercel's Build Output API v3 format:
//   .vercel/output/static/            ← dist/ (SPA)
//   .vercel/output/functions/api.func ← bundled Express app (Node.js)
// All /api/* requests go to the function; everything else falls back to index.html.
import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const FUNCTION_REGION = "bom1";

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
    // CommonJS dependencies (e.g. Cloudinary) expect require/__dirname inside the ESM bundle.
    js: [
      "import { createRequire as __cr } from 'node:module';",
      "import { fileURLToPath as __f2p } from 'node:url';",
      "import { dirname as __dn } from 'node:path';",
      "const require = __cr(import.meta.url);",
      "const __filename = __f2p(import.meta.url);",
      "const __dirname = __dn(__filename);",
    ].join(" "),
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
      // Mumbai: same AWS region as the Atlas cluster (ap-south-1) and closest to our
      // users in Bangladesh. With the Build Output API this per-function setting is
      // what decides where the function runs (vercel.json "regions" mirrors it).
      regions: [FUNCTION_REGION],
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
          src: "^/(.*)$",
          headers: {
            "x-content-type-options": "nosniff",
            "x-frame-options": "DENY",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy": "camera=(), microphone=(), geolocation=()",
            "strict-transport-security": "max-age=63072000; includeSubDomains",
          },
          continue: true,
        },
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
