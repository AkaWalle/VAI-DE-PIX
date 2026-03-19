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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Visão geral financeira",
  },
  {
    title: "Transações",
    url: "/transactions",
    icon: CreditCard,
    description: "Receitas e despesas",
  },
  {
    title: "Metas",
    url: "/goals",
    icon: Target,
    description: "Objetivos financeiros",
  },
  {
    title: "Caixinhas",
    url: "/envelopes",
    icon: Wallet,
    description: "Envelopes de orçamento",
  },
  {
    title: "Despesas Compartilhadas",
    url: "/shared-expenses",
    icon: Share2,
    description: "Dividir gastos entre pessoas",
  },
  {
    title: "Pendências",
    url: "/shared-expenses/pending",
    icon: Clock,
    description: "Convites de despesa para aceitar ou recusar",
  },
  {
    title: "Feed de atividade",
    url: "/activity-feed",
    icon: Activity,
    description: "Timeline de convites e atualizações",
  },
];

const reportItems = [
  {
    title: "Relatórios",
    url: "/reports",
    icon: FileText,
    description: "Análises e exportações",
  },
  {
    title: "Tendências",
    url: "/trends",
    icon: TrendingUp,
    description: "Análise de padrões",
  },
];

const configItems = [
  {
    title: "Automações",
    url: "/automations",
    icon: Zap,
    description: "Webhooks e regras",
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
    description: "Preferências e perfil",
  },
];

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

  const getNavClassName = (path: string) =>
    cn(
      "w-full transition-colors",
      collapsed ? "justify-center" : "justify-start",
      isActive(path)
        ? "bg-[rgba(200,255,0,0.08)] border border-[rgba(200,255,0,0.12)] text-[#c8ff00] font-medium"
        : "text-sidebar-foreground opacity-40 hover:opacity-70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
    );

  return (
    <Sidebar
      className={cn("border-r", collapsed ? "w-16" : "w-64")}
      collapsible="icon"
    >
      <SidebarHeader
        className={cn(
          "border-b border-sidebar-border",
          collapsed ? "p-2" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="text-sm font-bold text-white">VP</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <Logo size="md" />
              <p className="font-mono text-xs uppercase tracking-widest text-white/20">
                Controle Financeiro
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={collapsed ? "px-0" : ""}>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/20">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu
              className={collapsed ? "flex flex-col items-center" : ""}
            >
              {mainNavItems.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className={collapsed ? "flex justify-center" : ""}
                >
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? item.title : undefined}
                    className={
                      collapsed ? "!w-12 !h-12 !p-0 !justify-center" : ""
                    }
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavClassName(item.url)}
                      title={item.description}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) ? "text-[#c8ff00]" : "",
                        )}
                      />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/20">
              Análises
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu
              className={collapsed ? "flex flex-col items-center" : ""}
            >
              {reportItems.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className={collapsed ? "flex justify-center" : ""}
                >
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? item.title : undefined}
                    className={
                      collapsed ? "!w-12 !h-12 !p-0 !justify-center" : ""
                    }
                  >
                    <NavLink
                      to={item.url}
                      className={getNavClassName(item.url)}
                      title={item.description}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) ? "text-[#c8ff00]" : "",
                        )}
                      />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/20">
              Sistema
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu
              className={collapsed ? "flex flex-col items-center" : ""}
            >
              {configItems.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className={collapsed ? "flex justify-center" : ""}
                >
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? item.title : undefined}
                    className={
                      collapsed ? "!w-12 !h-12 !p-0 !justify-center" : ""
                    }
                  >
                    <NavLink
                      to={item.url}
                      className={getNavClassName(item.url)}
                      title={item.description}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) ? "text-[#c8ff00]" : "",
                        )}
                      />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "p-2" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#c8ff00] text-[#0a0a0a] text-sm">
              {user?.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name || "Usuário"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email || "email@exemplo.com"}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent"
              title="Sair"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
