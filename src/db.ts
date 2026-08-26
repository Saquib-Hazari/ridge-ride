import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon>;

export async function getClient() {
	if (!process.env.DATABASE_URL) {
		return undefined;
	}
	if (!client) {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) return undefined;
		client = await neon(databaseUrl);
	}
	return client;
}
