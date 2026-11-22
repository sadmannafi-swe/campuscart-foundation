import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app";

const app = createApp();

/** Vercel Node.js function entry: every /api/* request is routed here. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as never, res as never);
}
