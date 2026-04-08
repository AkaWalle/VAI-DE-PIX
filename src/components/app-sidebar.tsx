import {
  LayoutDashboard,
  CreditCard,
  Target,
  Wallet,
  FileText,
  Settings,
  Zap,
  TrendingUp,
  LogOut,
  Share2,
  Clock,
  Activity,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store-index";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mainNavItems = [
  { title: "Dashboard",    url: "/",                      icon: LayoutDashboard, description: "Visão geral financeira" },
  { title: "Transações",   url: "/transactions",          icon: CreditCard,      description: "Receitas e despesas" },
  { title: "Metas",        url: "/goals",                 icon: Target,          description: "Objetivos financeiros" },
  { title: "Caixinhas",    url: "/envelopes",             icon: Wallet,          description: "Envelopes de orçamento" },
  { title: "Compartilhadas", url: "/shared-expenses",    icon: Share2,          description: "Dividir gastos" },
  { title: "Pendências",   url: "/shared-expenses/pending", icon: Clock,         description: "Convites pendentes" },
  { title: "Feed",         url: "/activity-feed",         icon: Activity,        description: "Timeline de atividades" },
];

const reportItems = [
  { title: "Relatórios",  url: "/reports", icon: FileText,   description: "Análises e exportações" },
  { title: "Tendências",  url: "/trends",  icon: TrendingUp, description: "Análise de padrões" },
];

const configItems = [
  { title: "Automações",    url: "/automations", icon: Zap,      description: "Webhooks e regras" },
  { title: "Configurações", url: "/settings",    icon: Settings, description: "Preferências e perfil" },
];

function NavItem({
  item,
  collapsed,
  active,
}: {
  item: { title: string; url: string; icon: React.ElementType; description: string };
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem className={collapsed ? "flex justify-center" : ""}>
      <SidebarMenuButton
        asChild
        tooltip={collapsed ? item.title : undefined}
        className={collapsed ? "!w-10 !h-10 !p-0 !justify-center" : ""}
      >
        <NavLink
          to={item.url}
          end={item.url === "/"}
          title={item.description}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            collapsed ? "justify-center !px-0 !py-0 w-10 h-10" : "",
            active
              ? "bg-violet-500/15 text-white border-l-2 border-violet-400 pl-[10px]"
              : "text-sidebar-foreground hover:bg-white/5 hover:text-white",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center shrink-0 transition-colors",
              active ? "text-violet-400" : "text-sidebar-foreground group-hover:text-white",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          {!collapsed && <span className="truncate">{item.title}</span>}
          {active && !collapsed && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, logout } = useAuthStore();

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <Sidebar
      className={cn("border-r border-sidebar-border", collapsed ? "w-16" : "w-60")}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader
        className={cn(
          "border-b border-sidebar-border",
          collapsed ? "p-2 flex items-center justify-center" : "px-4 py-5",
        )}
      >
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          {/* Logo mark */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <span className="text-xs font-bold tracking-tight text-white">VP</span>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar-background bg-emerald-400" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-white">VAI DE PIX</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/50">
                Finanças
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className={cn("py-3", collapsed ? "px-1" : "px-2")}>
        {/* Main */}
        <SidebarGroup className="mb-1">
          {!collapsed && (
            <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={cn("gap-0.5", collapsed ? "flex flex-col items-center" : "")}>
              {mainNavItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} active={isActive(item.url)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        {!collapsed && <div className="mx-3 my-2 h-px bg-sidebar-border/60" />}

        {/* Reports */}
        <SidebarGroup className="mb-1">
          {!collapsed && (
            <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Análises
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={cn("gap-0.5", collapsed ? "flex flex-col items-center" : "")}>
              {reportItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} active={isActive(item.url)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        {!collapsed && <div className="mx-3 my-2 h-px bg-sidebar-border/60" />}

        {/* Config */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Sistema
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={cn("gap-0.5", collapsed ? "flex flex-col items-center" : "")}>
              {configItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} active={isActive(item.url)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5",
            collapsed ? "justify-center" : "",
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-violet-500/30">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-white">{user?.name || "Usuário"}</p>
                <p className="truncate text-[10px] text-sidebar-foreground/50">{user?.email || ""}</p>
              </div>
              <button
                onClick={logout}
                title="Sair"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
