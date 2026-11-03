import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function fetchServerSession() {
    try {
        return await getServerSession(authOptions);
    } catch (error) {
        // JWT decryption often fails if NEXTAUTH_SECRET changed or the cookie is stale.
        // Return null so callers (e.g. login page) treat as "no session" and the user can sign in again.
        return null;
    }
}