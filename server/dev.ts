import { createApp } from "./app";

const port = Number(process.env["API_PORT"] ?? 3001);
createApp().listen(port, () => {
  console.log(`CampusCart API on http://localhost:${port}`);
});
