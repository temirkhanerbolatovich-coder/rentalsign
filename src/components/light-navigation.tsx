"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavigationItem = { href: string; label: string; icon?: ReactNode };

/** The light follows pointer/keyboard focus; aria-current always reflects the route. */
export function LightNavigation({ items, label, className, vertical = false }: {
  items: NavigationItem[];
  label: string;
  className?: string;
  vertical?: boolean;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);

  function moveLight(target: HTMLElement | null) {
    const light = lightRef.current;
    if (!light) return;
    if (!target) {
      light.style.opacity = "0";
      return;
    }
    light.style.width = `${target.offsetWidth}px`;
    light.style.height = `${target.offsetHeight}px`;
    light.style.transform = `translate3d(${target.offsetLeft}px, ${target.offsetTop}px, 0)`;
    light.style.opacity = "1";
  }

  function restoreLight() {
    const nav = navRef.current;
    if (!nav) return;
    const focused = document.activeElement;
    moveLight(focused instanceof HTMLAnchorElement && nav.contains(focused)
      ? focused : nav.querySelector<HTMLElement>('[aria-current="page"]'));
  }

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const focused = document.activeElement;
      moveLight(focused instanceof HTMLAnchorElement && nav.contains(focused)
        ? focused : nav.querySelector<HTMLElement>('[aria-current="page"]'));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    nav.querySelectorAll("a").forEach((link) => observer.observe(link));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label={label}
      className={cn("light-navigation", vertical && "light-navigation-vertical", className)}
      onPointerLeave={restoreLight}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          moveLight(event.currentTarget.querySelector<HTMLElement>('[aria-current="page"]'));
        }
      }}>
      <span ref={lightRef} className="navigation-light" aria-hidden="true" />
      {items.map(({ href, label: itemLabel, icon }) => (
        <Link key={href} href={href}
          aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}
          className="light-navigation-link"
          onPointerEnter={(event) => moveLight(event.currentTarget)}
          onFocus={(event) => moveLight(event.currentTarget)}>
          {icon && <span className="navigation-icon" aria-hidden="true">{icon}</span>}
          <span>{itemLabel}</span>
        </Link>
      ))}
    </nav>
  );
}
