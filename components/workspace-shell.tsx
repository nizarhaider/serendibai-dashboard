import { Headphones, type LucideIcon } from "lucide-react"
import { Fragment, type ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type WorkspaceNavItem = {
  label: string
  href: string
  icon: LucideIcon
  active?: boolean
  badge?: string
}

type BreadcrumbItemType = {
  label: string
  href?: string
}

type WorkspaceShellProps = {
  breadcrumbs?: BreadcrumbItemType[]
  children: ReactNode
  headerActions?: ReactNode
  headerDescription?: string
  headerEyebrow?: string
  headerTitle: string
  navItems?: WorkspaceNavItem[]
  sidebarFooter?: ReactNode
  sidebarSubtitle?: string
  sidebarTag?: string
  userEmail?: string | null
}

function getInitials(value?: string | null) {
  if (!value) {
    return "SA"
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return "SA"
  }

  if (trimmed.includes("@")) {
    return trimmed.slice(0, 2).toUpperCase()
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function WorkspaceShell({
  breadcrumbs = [],
  children,
  headerActions,
  headerDescription,
  headerEyebrow,
  headerTitle,
  navItems = [],
  sidebarFooter,
  sidebarSubtitle = "AI call operations",
  sidebarTag = "Workspace",
  userEmail,
}: WorkspaceShellProps) {
  const hasSidebar = navItems.length > 0

  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div
        className={cn(
          "min-h-screen overflow-x-clip",
          hasSidebar ? "grid lg:grid-cols-[290px_1fr]" : "block"
        )}
      >
        {hasSidebar ? (
          <aside className="hidden border-b border-border/70 bg-white/72 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-5">
            <div className="flex h-full flex-col">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-[0_18px_40px_-28px_rgba(24,38,62,0.65)]">
                    <Headphones className="h-5 w-5" aria-hidden={true} />
                  </div>
                  <div>
                    <p className="font-semibold">SerendibAI</p>
                    <p className="text-sm leading-5 text-muted-foreground">{sidebarSubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="px-2.5">
                    {sidebarTag}
                  </Badge>
                  {userEmail ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar size="sm">
                        <AvatarFallback>{getInitials(userEmail)}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-28 truncate">{userEmail}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <Separator className="my-5" />
              <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <Button
                      asChild
                      key={item.href}
                      variant={item.active ? "secondary" : "ghost"}
                      className={cn(
                        "min-w-max justify-start gap-3 rounded-lg px-3 py-2.5",
                        item.active && "shadow-[0_18px_40px_-34px_rgba(24,38,62,0.45)]"
                      )}
                    >
                      <a href={item.href}>
                        <Icon className="h-4 w-4" aria-hidden={true} />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <Badge variant="outline" className="ml-auto px-2 text-[10px]">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </a>
                    </Button>
                  )
                })}
              </nav>
              {sidebarFooter ? (
                <>
                  <Separator className="mt-auto mb-5" />
                  <div>{sidebarFooter}</div>
                </>
              ) : null}
            </div>
          </aside>
        ) : null}

        <section className="min-w-0 overflow-x-hidden">
          {hasSidebar ? (
            <div className="border-b border-border/70 bg-white/78 px-4 py-4 backdrop-blur lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-[0_18px_40px_-28px_rgba(24,38,62,0.65)]">
                    <Headphones className="h-4 w-4" aria-hidden={true} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">SerendibAI</p>
                    <p className="truncate text-sm text-muted-foreground">{sidebarSubtitle}</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 px-2.5">
                  {sidebarTag}
                </Badge>
              </div>

              <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {navItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <Button
                      asChild
                      key={item.href}
                      size="sm"
                      variant={item.active ? "secondary" : "outline"}
                      className={cn(
                        "shrink-0 rounded-lg px-3",
                        item.active && "shadow-[0_18px_40px_-34px_rgba(24,38,62,0.45)]"
                      )}
                    >
                      <a href={item.href}>
                        <Icon className="h-4 w-4" aria-hidden={true} />
                        <span>{item.label}</span>
                      </a>
                    </Button>
                  )
                })}
              </nav>
            </div>
          ) : null}

          <header className="border-b border-border/70 bg-white/68 px-4 py-5 backdrop-blur-sm sm:px-6 lg:px-8">
            {breadcrumbs.length > 0 ? (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => (
                    <Fragment key={`${item.label}-${index}`}>
                      <BreadcrumbItem>
                        {item.href ? (
                          <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            ) : null}

            <div className={cn("flex flex-col gap-4", breadcrumbs.length > 0 && "mt-4", headerActions && "xl:flex-row xl:items-start xl:justify-between")}>
              <div className="max-w-3xl">
                {headerEyebrow ? (
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    {headerEyebrow}
                  </p>
                ) : null}
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {headerTitle}
                </h1>
                {headerDescription ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {headerDescription}
                  </p>
                ) : null}
              </div>
              {headerActions ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">{headerActions}</div>
              ) : null}
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  )
}
