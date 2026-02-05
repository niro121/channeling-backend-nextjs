'use client'

import React from "react"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

type Path = {
    path: string
    name: string
}

/** Map URL path segments to breadcrumb display names */
const PATH_NAMES: Path[] = [
    { path: "welcome", name: "Welcome" },
    { path: "users", name: "Users" },
    { path: "user-groups", name: "User Groups" },
    { path: "doctors", name: "Doctors" },
    { path: "doctor-sessions", name: "Doctor Sessions" },
    { path: "departments", name: "Departments" },
    { path: "patients", name: "Patients" },
    { path: "tags", name: "Tags" },
    { path: "zones", name: "Zones" },
    { path: "rooms", name: "Rooms" },
    { path: "specialities", name: "Specialities" },
    { path: "locations", name: "Locations" },
    { path: "agency-books", name: "Agency Books" },
    { path: "agencies", name: "Agencies" },
    { path: "discounts", name: "Discounts" },
    { path: "sms-playground", name: "SMS Playground" },
    { path: "reports", name: "Reports" },
    { path: "channel-booking", name: "Channel Booking" },
    { path: "customers", name: "Customers" },
    { path: "accounts", name: "Accounts" },
    { path: "unauthorized-access", name: "Unauthorized" },
    { path: "add", name: "Add" },
    { path: "edit", name: "Edit" },
]

/** Format a path segment for display: use mapped name or humanise the segment */
function formatSegment(segment: string): string {
    const mapped = PATH_NAMES.find((item) => item.path === segment)
    if (mapped) return mapped.name
    // Dynamic id segment (uuid or number): show as "Details"
    if (/^[0-9a-f-]{36}$/i.test(segment) || /^\d+$/.test(segment)) return "Details"
    // Fallback: convert kebab-case to Title Case (e.g. "some-route" -> "Some Route")
    return segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
}

function DashboardBreadcrumb() {
    const pathname = usePathname()
    const pathNames = pathname.split("/").filter(Boolean)

    return (
        <Breadcrumb className="hidden md:block min-w-0 flex-1">
            <BreadcrumbList className="flex flex-nowrap items-center gap-1.5 sm:gap-2 truncate">
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/welcome">Dashboard</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {
                    pathNames.map((link, index) => (
                        <React.Fragment key={link}>
                            <BreadcrumbItem className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
                                <BreadcrumbPage className={index === pathNames.length - 1 ? 'font-semibold text-foreground truncate' : 'truncate'}>
                                    {formatSegment(link)}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                            {index !== pathNames.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                    ))
                }
            </BreadcrumbList>
        </Breadcrumb>
    )
}

export default DashboardBreadcrumb