"use client";

import { useEffect, useState } from "react";

export type MenuSectionLink = { id: string; name: string; count: number };

/**
 * Sticky menu navigation with a scroll spy. Sections are plain anchors, so
 * this still works as a jump list before hydration — the highlight is the
 * only part that needs JavaScript.
 */
export function MenuSectionNav({ sections }: { sections: MenuSectionLink[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;

    const headings = sections
      .map((section) => document.getElementById(`section-${section.id}`))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    // The top band is offset to clear the sticky site header, so a section
    // counts as active once its heading reaches just under the header.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id.replace("section-", ""));
        }
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav aria-label="Menu sections" className="hidden lg:block">
      <ul className="sticky top-24 space-y-1">
        {sections.map((section) => {
          const isActive = section.id === activeId;

          return (
            <li key={section.id}>
              <a
                href={`#section-${section.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-brand-subtle font-semibold text-brand"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <span className="truncate">{section.name}</span>
                <span className="ml-2 shrink-0 tabular-nums opacity-70">
                  {section.count}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
