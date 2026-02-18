import { writeFileSync } from "node:fs";
import app from "../src/index";

async function main() {
  const res = await app.request("/doc");
  const spec = await res.json();
  writeFileSync("openapi.json", JSON.stringify(spec, null, 2));
  console.log("Generated openapi.json");
}

main();
