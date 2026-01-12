import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Package, LogOut, Menu, X, Users } from "lucide-react";
import { authApi } from "../services/authApi";

// simple className merger
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false); // mobile
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop collapsed
  const [isLarge, setIsLarge] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // ignore; we still want to clear any local UI state
    } finally {
      setIsLoggingOut(false);
      window.location.href = "/";
    }
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsLarge("matches" in e ? e.matches : mq.matches);
    // set initial
    setIsLarge(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler as any);
    else mq.addListener(handler as any);
    return () => {
      if (mq.removeEventListener)
        mq.removeEventListener("change", handler as any);
      else mq.removeListener(handler as any);
    };
  }, []);

  useEffect(() => {
    // lock body scroll when mobile menu open
    if (isOpen && !isLarge) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, isLarge]);

  const mainMenu = [
    {
      title: "Dashboard",
      to: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Shipments",
      to: "/shipments",
      icon: <Package className="h-5 w-5" />,
    },
    {
      title: "Customers",
      to: "/customers",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  const location = useLocation();
  const headerTitle =
    mainMenu.find((m) => m.to === location.pathname)?.title || "Dashboard";

  return (
    <div className="flex min-h-screen bg-muted/50">
      {/* mobile backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      />

      {/* sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex flex-col transition-all duration-300 overflow-x-hidden no-scrollbar",
          // MOBILE: full height, full width sidebar
          "h-screen w-64",
          // DESKTOP: sticky, adjust width based on collapsed state
          "lg:sticky lg:top-0 lg:h-screen",
          isCollapsed && "lg:w-20",
          !isCollapsed && "lg:w-64",
          // mobile translate
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-medium)",
        }}
      >
        {/* header */}
        <div
          className={cn(
            "h-16 flex items-center justify-between px-4 border-b shrink-0"
          )}
          style={{
            borderColor: "var(--border-medium)",
            color: "var(--text-primary)",
          }}
        >
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-primary truncate">
                    Digital Delivery
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Logistics Platform
                  </div>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-accent"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            // collapsed header (desktop only)
            <div className="w-full flex items-center justify-center">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Package className="h-5 w-5" />
              </div>
            </div>
          )}
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          <div>
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Main Menu
              </h3>
            )}
            <div className="space-y-1">
              {mainMenu.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => !isLarge && setIsOpen(false)} // Close mobile menu on navigation
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center rounded-lg transition-all duration-200 overflow-hidden",
                      isCollapsed
                        ? "justify-center px-0 py-2.5 gap-0"
                        : "gap-3 px-3 py-2.5",
                      isActive && "shadow-sm active"
                    )
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive
                      ? "var(--bg-tertiary)"
                      : "transparent",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  })}
                  onMouseEnter={(e) => {
                    const isActive =
                      e.currentTarget.getAttribute("aria-current") === "page";
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(46,196,182,0.08)";
                      e.currentTarget.style.color = "var(--accent-teal)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isActive =
                      e.currentTarget.getAttribute("aria-current") === "page";
                    e.currentTarget.style.backgroundColor = isActive
                      ? "var(--bg-tertiary)"
                      : "transparent";
                    e.currentTarget.style.color = isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)";
                  }}
                >
                  <span
                    className="shrink-0 flex items-center justify-center transition-colors duration-200"
                    style={{ color: "inherit" }}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={cn("font-medium", isCollapsed && "lg:sr-only")}
                  >
                    {item.title}
                  </span>

                  {/* Tooltip for collapsed desktop view */}
                  {isCollapsed && isLarge && (
                    <div
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transform transition-all duration-200 group-hover:translate-x-1 shadow-lg"
                      style={{
                        backgroundColor: "var(--bg-overlay)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-medium)",
                      }}
                    >
                      {item.title}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* footer */}
        <div
          className="mt-auto border-t p-4 shrink-0"
          style={{
            borderColor: "var(--border-medium)",
            color: "var(--text-primary)",
          }}
        >
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                <div
                  className="h-10 w-10 rounded-full shrink-0"
                  style={{
                    backgroundColor: "var(--brand-primary)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                  }}
                >
                  TP
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">TechPro</div>
                  <div
                    className="text-xs truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    techpro@email.com
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: "var(--border-medium)",
                  color: isLoggingOut ? "var(--text-secondary)" : "#ef4444",
                  backgroundColor: isLoggingOut
                    ? "var(--bg-tertiary)"
                    : "transparent",
                  cursor: isLoggingOut ? "not-allowed" : "pointer",
                  opacity: isLoggingOut ? 0.6 : 1,
                }}
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-10 w-10 rounded-full"
                style={{
                  backgroundColor: "var(--brand-primary)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                }}
              >
                TP
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-2 rounded relative group hover:bg-destructive/10 transition-colors"
              >
                <LogOut
                  className="h-5 w-5"
                  style={{ color: "var(--status-failed)" }}
                />
                {isLarge && (
                  <div
                    className="absolute left-full ml-2 px-2 py-1 text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-lg"
                    style={{
                      backgroundColor: "var(--bg-overlay)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                    }}
                  >
                    Logout
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* main content area */}
      <div className="flex-1 flex flex-col min-h-screen w-full">
        {/* header bar */}
        <header
          className="sticky top-0 h-16 border-b z-30 flex items-center px-4 lg:px-6 shrink-0"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Toggle button */}
            <button
              onClick={() => {
                if (isLarge) setIsCollapsed((s) => !s);
                else setIsOpen((s) => !s);
              }}
              aria-label={
                isLarge
                  ? isCollapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
                  : isOpen
                  ? "Close menu"
                  : "Open menu"
              }
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {isLarge ? (
                isCollapsed ? (
                  <Menu
                    className="h-5 w-5"
                    style={{ color: "var(--text-primary)" }}
                  />
                ) : (
                  <X
                    className="h-5 w-5"
                    style={{ color: "var(--text-primary)" }}
                  />
                )
              ) : (
                <Menu
                  className="h-5 w-5"
                  style={{ color: "var(--text-primary)" }}
                />
              )}
            </button>
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {headerTitle}
            </h1>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-accent transition-colors relative">
              <Package
                className="h-5 w-5"
                style={{ color: "var(--text-primary)" }}
              />
              <span
                className="absolute top-1 right-1 h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--brand-primary)" }}
              />
            </button>
          </div>
        </header>

        {/* content */}
        <main className="flex-1 p-4 lg:p-6 bg-muted/50 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Sidebar;
