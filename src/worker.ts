import { Hono } from "hono";
import app from "./index.js";

type Bindings = {
	DATABASE_URL: string;
	ALLOWED_ORIGIN: string;
	RESEND_API_KEY: string;
	RESEND_FROM_EMAIL: string;
	NISSHI_DEV_SURVEY_API_KEY: string;
};

const worker = new Hono<{ Bindings: Bindings }>();

worker.use("*", async (c, next) => {
	for (const [key, value] of Object.entries(c.env)) {
		if (typeof value === "string") {
			process.env[key] = value;
		}
	}
	await next();
});

worker.route("/", app);

export default worker;
