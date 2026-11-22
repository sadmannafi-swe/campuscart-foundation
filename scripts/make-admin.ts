// Usage: npm run make-admin -- someone@example.com   (needs MONGODB_URI in .env.local)
import { MongoClient } from "mongodb";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}
const client = new MongoClient(process.env["MONGODB_URI"] ?? "");
await client.connect();
const users = client.db(process.env["MONGODB_DB"] || "campuscart").collection("user");
const r = await users.updateOne({ email }, { $set: { role: "admin" } });
console.log(
  r.matchedCount
    ? `✓ ${email} is now an admin`
    : `No account with e-mail ${email} — sign up first.`,
);
await client.close();
