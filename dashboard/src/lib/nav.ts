export interface NavItem {
  href: string
  label: string
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/machines", label: "Monitors" },
  { href: "/analytics", label: "Analytics" },
  { href: "/incidents", label: "Incidents" },
  { href: "/reports", label: "Reports" },
]

// Turns the current pathname into the label shown in the header bar.
export function getRouteTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  if (pathname.startsWith("/machines/")) return "Monitor Detail"
  if (pathname.startsWith("/reports/")) return "Report Detail"

  const match = navItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  )
  return match?.label ?? "Dashboard"
}
