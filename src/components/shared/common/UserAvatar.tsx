import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  user: Pick<User, "name" | "avatar" | "profileImage">
  /** Size, shape and the initials fallback's colours. */
  className?: string
}

/** The user's profile picture, or their initials when they have not set one. */
export function UserAvatar({ user, className }: UserAvatarProps) {
  if (user.profileImage) {
    return (
      <img
        src={user.profileImage}
        alt={user.name}
        className={cn("object-cover shrink-0", className)}
      />
    )
  }

  return (
    <div className={cn("flex items-center justify-center shrink-0", className)}>{user.avatar}</div>
  )
}
