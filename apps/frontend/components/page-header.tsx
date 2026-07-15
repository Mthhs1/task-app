import { NotificationBadge } from "@/components/notification-badge"
import { UserMenu } from "@/components/user-menu"

type PageHeaderProps = {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex h-14 items-center justify-between  bg-background px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="ml-auto flex items-center gap-4">
        <NotificationBadge />
        <UserMenu />
      </div>
    </div>
  )
}
