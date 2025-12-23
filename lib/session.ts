import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function fetchServerSession() {
    return await getServerSession(authOptions);
}