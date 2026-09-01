import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { ApprovalCenterContent } from "./approval-center-content"

export default async function ApprovalsPage() {
  const canView = await checkRouteAccess("/approvals")
  if (!canView) redirect("/unauthorized-access")
  return <ApprovalCenterContent />
}
