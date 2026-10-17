'use client';

import React, { isValidElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  CursorPointer01Icon,
  Download04Icon,
  Layers01Icon,
  Notification03Icon,
  PaintBoardIcon,
  Rocket01Icon,
  Settings02Icon,
  TextFontIcon
} from '@hugeicons/core-free-icons';
export interface BranchedMenuChild {
  value: string;
  label: string;
  icon?: ReactNode | IconSvgElement;
  actions?: ReactNode;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export interface BranchedMenuItem {
  label: string;
  value?: string;
  icon?: ReactNode | IconSvgElement;
  rightSlot?: ReactNode;
  headerClassName?: string;
  onHeaderClick?: (isOpen: boolean, toggle: () => void) => void;
  children?: BranchedMenuChild[];
}

export interface BranchedMenuProps {
  items?: BranchedMenuItem[];
  defaultOpen?: number | number[];
  defaultActive?: string;
  onSelect?: (value: string, item: BranchedMenuChild | BranchedMenuItem) => void;
  onToggle?: (index: number, open: boolean) => void;
  color?: string;
  accentColor?: string;
  lineColor?: string;
  width?: number;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  lineWidth?: number;
  fontSize?: number;
  drawDuration?: number;
  foldDuration?: number;
  hideRail?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: BranchedMenuItem[] = [
  {
    label: 'Getting started',
    children: [
      { value: 'install', label: 'Installation', icon: Download04Icon },
      { value: 'quick', label: 'Quick start', icon: Rocket01Icon },
      { value: 'config', label: 'Configuration', icon: Settings02Icon },
      { value: 'theming', label: 'Theming', icon: PaintBoardIcon }
    ]
  },
  {
    label: 'Components',
    children: [
      { value: 'buttons', label: 'Buttons', icon: CursorPointer01Icon },
      { value: 'typography', label: 'Typography', icon: TextFontIcon },
      { value: 'overlays', label: 'Overlays', icon: Layers01Icon },
      { value: 'toasts', label: 'Toasts', icon: Notification03Icon }
    ]
  }
];
const PAD = 6;
const MARK = 16;

const renderIcon = (icon: ReactNode | IconSvgElement) =>
  isValidElement(icon) ? icon : <HugeiconsIcon icon={icon as IconSvgElement} size={16} strokeWidth={1.8} />;
const toSet = (open: number | number[]) => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

const BranchedHeaderRow: React.FC<{
  item: BranchedMenuItem;
  isOpen: boolean;
  leafActive: boolean;
  headRef: (el: HTMLDivElement | null) => void;
  onClick: () => void;
}> = ({ item, isOpen, leafActive, headRef, onClick }) => {
  const iconRef = useRef<{ startAnimation?: () => void; stopAnimation?: () => void } | null>(null);
  const renderedIcon = item.icon
    ? isValidElement(item.icon)
      ? React.cloneElement(item.icon as React.ReactElement<any>, { ref: iconRef })
      : renderIcon(item.icon)
    : null;

  return (
    <div
      ref={headRef}
      role="button"
      tabIndex={0}
      className={
        item.headerClassName ??
        'm-0 flex items-center justify-between cursor-pointer border-0 bg-transparent py-[9px] text-left font-medium outline-none [color:var(--bm-muted)] [font-family:inherit] [font-size:calc(var(--bm-font)+1px)] [-webkit-tap-highlight-color:transparent] [transition:color_200ms_ease] group-data-[open]/section:[color:var(--bm-ink)] data-[active]:[color:var(--bm-ink)] hover:[color:var(--bm-ink)] select-none'
      }
      aria-expanded={item.children ? isOpen : undefined}
      aria-current={leafActive ? 'true' : undefined}
      data-active={leafActive ? '' : undefined}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <div className="flex items-center gap-3 min-w-0">
        {renderedIcon ? (
          <span className="inline-flex flex-none" aria-hidden="true">
            {renderedIcon}
          </span>
        ) : null}
        <span className="truncate">{item.label}</span>
      </div>
      {item.rightSlot}
    </div>
  );
};

const BranchedKidRow: React.FC<{
  kid: BranchedMenuChild;
  isActive: boolean;
  isOpen: boolean;
  onSelect: () => void;
}> = ({ kid, isActive, isOpen, onSelect }) => {
  const iconRef = useRef<{ startAnimation?: () => void; stopAnimation?: () => void } | null>(null);
  const renderedIcon = kid.icon
    ? isValidElement(kid.icon)
      ? React.cloneElement(kid.icon as React.ReactElement<any>, { ref: iconRef })
      : renderIcon(kid.icon)
    : null;

  return (
    <div
      role="button"
      className="group/kid m-0 box-border flex w-full cursor-pointer items-center justify-between gap-1.5 border-0 bg-transparent py-0 pr-1 text-left outline-none [height:var(--bm-row)] [padding-left:var(--bm-indent)] [color:var(--bm-muted)] [font-family:inherit] [-webkit-tap-highlight-color:transparent] [transition:color_200ms_ease] hover:[color:var(--bm-ink)] data-[active]:font-medium data-[active]:[color:var(--bm-accent)] select-none"
      aria-current={isActive ? 'true' : undefined}
      data-active={isActive ? '' : undefined}
      tabIndex={isOpen ? 0 : -1}
      onClick={onSelect}
      onDoubleClick={kid.onDoubleClick}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {renderedIcon ? (
          <span className="inline-flex flex-none" aria-hidden="true">
            {renderedIcon}
          </span>
        ) : null}
        <span className="truncate whitespace-nowrap">{kid.label}</span>
      </div>
      {kid.actions ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 opacity-0 group-hover/kid:opacity-100 transition-opacity flex-shrink-0"
        >
          {kid.actions}
        </div>
      ) : null}
    </div>
  );
};

const BranchedMenu: React.FC<BranchedMenuProps> = ({
  items = DEFAULT_ITEMS,
  defaultOpen = 0,
  defaultActive = '',
  onSelect,
  onToggle,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  hideRail = false,
  className = ''
}) => {
  const [open, setOpen] = useState<Set<number>>(() => toSet(defaultOpen));
  const [active, setActive] = useState(() => {
    if (defaultActive) return defaultActive;
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
    return first?.children?.[0]?.value ?? '';
  });

  useEffect(() => {
    if (defaultActive !== undefined) {
      setActive(defaultActive);
    }
  }, [defaultActive]);

  useEffect(() => {
    if (defaultOpen !== undefined) {
      setOpen(toSet(defaultOpen));
    }
  }, [defaultOpen]);

  const navRef = useRef<HTMLElement>(null);
  const heads = useRef<(HTMLDivElement | null)[]>([]);
  const markerRef = useRef<HTMLSpanElement>(null);
  const latest = useRef<{ onSelect?: BranchedMenuProps['onSelect']; onToggle?: BranchedMenuProps['onToggle'] }>({});
  latest.current = { onSelect, onToggle };

  const activeSection = items.findIndex(it => it.children?.some(kid => kid.value === active));
  const markerShown = !hideRail && activeSection >= 0 && open.has(activeSection);
  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = 'none';
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute('data-on', Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = '';
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  const select = (value: string, item: BranchedMenuChild | BranchedMenuItem) => {
    setActive(value);
    latest.current.onSelect?.(value, item);
  };
  const toggle = (i: number) => {
    setOpen(prev => {
      const next = new Set(prev);
      const isOpen = !next.has(i);
      if (isOpen) next.add(i);
      else next.delete(i);
      latest.current.onToggle?.(i, isOpen);
      return next;
    });
  };

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k: number) => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k: number) => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  const railClasses = hideRail
    ? 'w-full'
    : "w-fit pl-3.5 before:absolute before:top-2 before:bottom-0 before:left-0 before:w-0.5 before:rounded-[1px] before:[background:linear-gradient(to_bottom,var(--bm-line)_0%,var(--bm-line)_55%,transparent_100%)] before:content-['']";

  return (
    <nav
      ref={navRef}
      className={`relative flex max-w-[min(var(--bm-w),100%)] flex-col leading-[1.2] [color:var(--bm-ink)] [font-family:inherit] [font-size:var(--bm-font)] ${railClasses}${className ? ` ${className}` : ''}`}
      style={
        {
          '--bm-w': `${width}px`,
          '--bm-ink': color,
          '--bm-accent': accentColor,
          '--bm-line': lineColor,
          '--bm-font': `${fontSize}px`,
          '--bm-row': `${rowHeight}px`,
          '--bm-indent': `${indent}px`,
          '--bm-line-w': lineWidth,
          '--bm-draw': `${drawDuration}ms`,
          '--bm-muted': `color-mix(in srgb, ${color} 55%, transparent)`,
          '--bm-fold': `${foldDuration}ms`
        } as CSSProperties
      }
    >
      {!hideRail && (
        <span
          ref={markerRef}
          className="absolute -top-px left-0 z-[1] h-4 w-0.5 rounded-[1px] opacity-0 [background:var(--bm-accent)] [transition:top_220ms_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease] data-[on]:opacity-100 motion-reduce:[transition:opacity_150ms_ease]"
          aria-hidden="true"
        />
      )}
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = kids ? open.has(i) : false;
        const leafValue = item.value ?? item.label;
        const leafActive = !kids && leafValue === active;
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0;
        return (
          <div
            key={item.value ?? item.label}
            className="group/section flex flex-col"
            data-open={isOpen ? '' : undefined}
          >
            <BranchedHeaderRow
              item={item}
              isOpen={isOpen}
              leafActive={leafActive}
              headRef={el => {
                heads.current[i] = el;
              }}
              onClick={() => {
                if (item.onHeaderClick) {
                  item.onHeaderClick(isOpen, () => toggle(i));
                } else if (kids) {
                  toggle(i);
                } else {
                  select(leafValue, item);
                }
              }}
            />
            {kids ? (
              <div className="grid [grid-template-rows:0fr] [transition:grid-template-rows_var(--bm-fold)_cubic-bezier(0.23,1,0.32,1)] group-data-[open]/section:[grid-template-rows:1fr] motion-reduce:transition-none">
                <div className="min-h-0 overflow-hidden">
                  <div className="relative box-border py-1.5" style={{ height: bodyH }}>
                    <svg
                      className="pointer-events-none absolute top-0 left-0 overflow-visible opacity-0 [transition:opacity_200ms_ease] group-data-[open]/section:opacity-100 group-data-[open]/section:[transition:opacity_250ms_ease_100ms]"
                      width={indent}
                      height={bodyH}
                      aria-hidden="true"
                    >
                      <path
                        className="fill-none [stroke:var(--bm-line)] [stroke-width:var(--bm-line-w)] [stroke-linecap:round] [stroke-linejoin:round]"
                        d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`}
                      />
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="fill-none [stroke:var(--bm-line)] [stroke-width:var(--bm-line-w)] [stroke-linecap:round] [stroke-linejoin:round]"
                          d={branch(k)}
                        />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="fill-none [stroke:var(--bm-accent)] [stroke-width:var(--bm-line-w)] [stroke-linecap:round] [stroke-linejoin:round] [transition:stroke-dashoffset_var(--bm-draw)_cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                          d={reach(k)}
                          style={{
                            strokeDasharray: length(k),
                            strokeDashoffset: kid.value === active ? 0 : length(k)
                          }}
                        />
                      ))}
                    </svg>
                    {kids.map(kid => (
                      <BranchedKidRow
                        key={kid.value}
                        kid={kid}
                        isActive={kid.value === active}
                        isOpen={isOpen}
                        onSelect={() => select(kid.value, kid)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
};

export default BranchedMenu;
