import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { fetchServerSession } from "@/lib/session"
import { userTypes } from "@/lib/roles"
import {
  getApprovalAccess,
  listApprovalRequests,
} from "@/services/approval-request.service"
import { ApprovalCenterContent } from "./approval-center-content"

export default async function ApprovalsPage() {
  const canView = await checkRouteAccess("/approvals")
  if (!canView) redirect("/unauthorized-access")

  const session = await fetchServerSession()
  if (!session?.user?.id) redirect("/unauthorized-access")

  const userId = session.user.id
  const permissions = session.user.permissions
  const isAdmin = session.user.userType === userTypes.admin
  const access = getApprovalAccess(permissions, isAdmin)
  const view = access.canAttend ? "attend" : "mine"
  const initial = await listApprovalRequests({
    view,
    type: "all",
    status: "open",
    page: 1,
    limit: 20,
    userId,
    permissions,
    isAdmin,
  })

  return (
    <ApprovalCenterContent
      initialAccess={access}
      initialView={view}
      initialRows={initial.success ? initial.data : []}
      initialTotal={initial.success ? initial.total : 0}
    />
  )
}
