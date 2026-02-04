import { Button } from "@/components/ui/button"
import { fetchServerSession } from "@/lib/session"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import SignOutButton from "@/components/common/signout-btn"

function getInitial(name?: string | null, email?: string | null): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase()
  if (email?.trim()) return email.trim().charAt(0).toUpperCase()
  return 'U'
}

export async function Profile() {
  const session = await fetchServerSession()
  const user = session?.user
  const initial = getInitial(user?.name ?? null, user?.email ?? null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="overflow-hidden rounded-full h-9 w-9"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'Profile'} />
            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem>
            <SignOutButton />
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem>
            <Link href="/login">Sign In</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
