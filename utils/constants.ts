export function verifyEnv(env: string): string {
    if (!process.env[env]) {
        throw new Error(`${env} environment variable is not set`);
    }
    return process.env[env]!;
}

export const ENV_VARS = {
    CLERK_PUBLISHABLE_KEY: verifyEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    DATABASE_URL: verifyEnv("DATABASE_URL"),
    CLERK_SECRET_KEY: verifyEnv("CLERK_SECRET_KEY"),
    // RESEND_API_KEY: verifyEnv("RESEND_API_KEY"), // todo: ADD later, prompt user for it when you need it.
};
