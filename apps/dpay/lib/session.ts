import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function fetchServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
