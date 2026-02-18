import { writeFileSync } from "node:fs";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:8787";
const res = await fetch(`${baseUrl}/doc`);
const spec = await res.json();
writeFileSync("openapi.json", JSON.stringify(spec, null, 2));
console.log("Generated openapi.json");
