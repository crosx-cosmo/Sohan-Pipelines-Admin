import { AdminAvatarImage } from "@/components/common/admin-avatar-image";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronRight, LogOut, Moon, Search, Settings, Sun, UserCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { admin, notifications } from "@/lib/mock-data";
import { BRAND_LOGO_URL } from "@/lib/supabase";
import { useData } from "@/components/auth/auth-gate";
import { initials, timeAgo } from "@/lib/format";
import { useTheme } from "@/components/theme-provider";
import { buildNavGroups, routeTitles, type NavItem } from "./nav-config";
import { CommandPalette } from "./command-palette";

function BrandMark() {
  return (
    <div className="flex h-14 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <img
        src={BRAND_LOGO_URL}
        alt="SOHAN PIPELINES logo"
        className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-sidebar-border transition-transform duration-200 group-hover:scale-[1.03]"
      />
      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
        <p className="truncate font-display text-[13px] font-semibold text-sidebar-foreground">
          SOHAN PIPELINES
        </p>
        <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/55">Operations Console</p>
      </div>
    </div>
  );
}

function SidebarNavigation({ pathname, searchStr }: { pathname: string; searchStr: string }) {
  const { setOpenMobile } = useSidebar();

  return (
    <nav aria-label="Main navigation" className="py-2">
      {buildNavGroups().map((group) => (
        <SidebarGroup key={group.label} className="px-2 py-2.5">
          <SidebarGroupLabel className="mb-1 h-6 px-2.5 text-[10px] font-semibold uppercase text-sidebar-foreground/45">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  searchStr={searchStr}
                  onNavigate={() => setOpenMobile(false)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  );
}

function SidebarNavItem({
  item,
  pathname,
  searchStr,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  searchStr: string;
  onNavigate: () => void;
}) {
  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const itemClassName =
    "h-10 gap-3 rounded-lg px-2.5 text-[13px] font-medium text-sidebar-foreground/68 transition-[background-color,color,box-shadow,transform] duration-200 hover:translate-x-px hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-2.5";

  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active} tooltip={item.label} className={itemClassName}>
          <Link to={item.to} onClick={onNavigate}>
            <item.icon className="size-4" strokeWidth={active ? 2.25 : 1.8} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        {item.badge && (
          <SidebarMenuBadge className="right-2.5 top-2.5 h-5 min-w-5 rounded-full bg-sidebar-accent px-1.5 text-[10px] text-sidebar-primary">
            {item.badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={active}
            tooltip={item.label}
            className={cn(itemClassName, "pr-2 group-data-[collapsible=icon]:pr-2.5")}
            aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
          >
            <item.icon className="size-4" strokeWidth={active ? 2.25 : 1.8} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto min-w-5 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-center text-[10px] font-semibold text-sidebar-primary group-data-[collapsible=icon]:hidden">
                {item.badge}
              </span>
            )}
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-sidebar-foreground/45 transition-transform duration-200 ease-out motion-reduce:transition-none group-data-[collapsible=icon]:hidden",
                !item.badge && "ml-auto",
                open && "rotate-90",
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent className="sidebar-accordion-content group-data-[collapsible=icon]:!block">
          <SidebarMenuSub className="my-1 ml-[1.12rem] mr-0 gap-0.5 border-sidebar-border py-0.5 pl-4 pr-0 group-data-[collapsible=icon]:hidden">
            {item.children.map((child) => {
              const childSearch = child.search
                ? `?${new URLSearchParams(child.search).toString()}`
                : "";
              const childActive = pathname === child.to && searchStr === childSearch;
              return (
                <SidebarMenuSubItem key={`${child.to}${childSearch}`}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={childActive}
                    className="relative h-8 px-2.5 text-[12px] text-sidebar-foreground/58 transition-colors duration-200 before:absolute before:-left-[1.09rem] before:h-4 before:w-0.5 before:rounded-full before:bg-transparent hover:bg-sidebar-accent/70 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/65 data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary data-[active=true]:before:bg-sidebar-primary"
                  >
                    <Link to={child.to} search={child.search ?? {}} onClick={onNavigate}>
                      <span>{child.label}</span>
                      {child.badge !== undefined && child.badge > 0 && (
                        <span className="num ml-auto text-[10px] font-semibold text-sidebar-foreground/45">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NotificationBell() {
  const [items, setItems] = useState(notifications);
  useEffect(() => {
    setItems([...notifications]);
  }, [notifications.length]);
  const unread = items.filter((n) => n.unread).length;
  const tone: Record<string, string> = {
    urgent: "bg-destructive",
    warning: "bg-warning",
    success: "bg-success",
    info: "bg-info",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            className="text-xs text-primary transition-opacity hover:opacity-70"
            onClick={() => {
              setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
              toast.success("All notifications marked as read");
            }}
          >
            Mark all read
          </button>
        </div>
        <ScrollArea className="max-h-80">
          <ul className="divide-y">
            {items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                  n.unread && "bg-primary/[0.04]",
                )}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone[n.kind])} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(n.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, idx) => {
    const to = "/" + segments.slice(0, idx + 1).join("/");
    return { label: routeTitles[to] ?? decodeURIComponent(seg).replace(/-/g, " "), to };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
      <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
        Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
          <span
            className={cn(
              "truncate capitalize",
              i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {c.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const { version, signOut } = useData();
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-none">
        <SidebarHeader className="border-b border-sidebar-border p-2">
          <BrandMark />
        </SidebarHeader>
        <SidebarContent className="gap-0 overflow-x-hidden">
          <SidebarNavigation pathname={pathname} searchStr={searchStr} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2.5 group-data-[collapsible=icon]:p-1.5">
          <div className="flex h-12 items-center gap-3 rounded-md px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Avatar className="size-8 shrink-0 ring-1 ring-sidebar-border">
              <AdminAvatarImage />
              <AvatarFallback>{initials(admin.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[13px] font-semibold text-sidebar-foreground">
                {admin.name}
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/55">{admin.role}</p>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/80 bg-background/85 px-3 backdrop-blur-xl sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 hidden h-5 md:block" />
          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="group hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-all duration-200 hover:border-border-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:flex xl:w-72"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Search everything…</span>
              <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Search"
              onClick={() => setPaletteOpen(true)}
            >
              <Search className="size-4.5" />
            </Button>

            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
              {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </Button>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8.5 transition-transform duration-200 hover:scale-105">
                    <AdminAvatarImage />
                    <AvatarFallback>{initials(admin.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{admin.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {admin.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserCircle className="size-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="size-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut();
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          key={`${pathname}-${version}`}
          className={cn(
            "page-enter min-w-0 flex-1 p-4 sm:p-6 lg:p-8",
            pathname !== "/" && "operations-workspace",
          )}
        >
          <div className="mx-auto w-full max-w-[1440px] space-y-6">{children}</div>
        </main>
      </SidebarInset>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
}
