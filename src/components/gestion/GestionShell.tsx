"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS } from "./nav";

function isActive(pathname: string, href: string) {
  if (href === "/gestion") return pathname === "/gestion";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  pathname: string;
  onClick?: () => void;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[#f2891f] text-[#0a0a0a]"
          : "text-[#efe9df] hover:bg-[#1c1712]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function GestionShell({
  nombre,
  rol,
  children,
}: {
  nombre: string;
  rol: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/gestion/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh bg-[#0a0a0a] text-[#efe9df]">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-[#2a2216] md:bg-[#111111]">
        <div className="flex items-center gap-3 border-b border-[#2a2216] px-5 py-5">
          <Image
            src="/norte-logo.jpg"
            alt="Norte Motorepuestos"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <p className="font-display text-sm uppercase tracking-wide text-[#f2891f]">
              Norte
            </p>
            <p className="text-xs text-[#a89a89]">Panel de gestión</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.filter((item) => !item.adminOnly || rol === "admin").map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#2a2216] bg-[#111111] px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              className="rounded-md border border-[#2a2216] p-2 text-lg leading-none"
            >
              ☰
            </button>
            <Image
              src="/norte-logo.jpg"
              alt="Norte Motorepuestos"
              width={32}
              height={32}
              className="rounded-md"
            />
          </div>

          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-semibold">{nombre}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#f7c948]">
                {rol}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-[#2a2216] px-3 py-1.5 text-xs font-semibold text-[#efe9df] transition hover:border-[#d62828] hover:text-[#d62828]"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="flex h-full w-72 max-w-[80vw] flex-col bg-[#111111] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src="/norte-logo.jpg"
                    alt="Norte Motorepuestos"
                    width={32}
                    height={32}
                    className="rounded-md"
                  />
                  <span className="font-display text-sm uppercase tracking-wide text-[#f2891f]">
                    Norte
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="rounded-md border border-[#2a2216] px-2.5 py-1 text-sm"
                >
                  ✕
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.filter((item) => !item.adminOnly || rol === "admin").map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    pathname={pathname}
                    onClick={() => setMenuOpen(false)}
                  />
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
