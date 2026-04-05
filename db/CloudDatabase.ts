import { neon } from "@neondatabase/serverless";
import { ENV_VARS } from "../utils/constants";

const sql = neon(ENV_VARS.DATABASE_URL);

/**
 * Add static async SQL methods here, for CRUD and etc, allow parameters to be passed.
 */
export class CloudDatabase {
}
