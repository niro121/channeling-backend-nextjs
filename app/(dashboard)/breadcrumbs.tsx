'use client'

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

type Path = {
    path: string,
    name: string
}

const pathArray: Path[] = [
    {
        path: "accounts",
        name: "Accounts"
    },
    {
        path: "users",
        name: "Users"
    },
    {
        path: "welcome",
        name: "Welcome"
    },
]

function DashboardBreadcrumb() {

    const paths = usePathname()
    const pathNames = paths.split('/').filter(path => path)

    const getLink = (link: string) => {
        const foundLink = pathArray.find((item) => item.path === link)

        if (foundLink) {
            return foundLink.name
        }

        return link
    }

    return (
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {
                    pathNames.map((link, index) => (
                        <div key={link} className="flex items-center gap-1.5 sm:gap-2.5">
                            <BreadcrumbItem>
                                <BreadcrumbPage>{getLink(link)}</BreadcrumbPage>
                            </BreadcrumbItem>
                            {
                                index !== (pathNames.length - 1) && <BreadcrumbSeparator />
                            }
                        </div>
                    ))
                }
            </BreadcrumbList>
        </Breadcrumb>
    )
}

export default DashboardBreadcrumb