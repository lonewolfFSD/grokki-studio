'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon, Search01Icon } from '@hugeicons/core-free-icons';

export interface GlideSelectOption {
  value: string;
  label: ReactNode;
  tag?: string;
}

export interface GlideSelectProps {
  options?: (string | GlideSelectOption)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: GlideSelectOption) => void;
  placeholder?: string;
  showTags?: boolean;
  accentColor?: string;
  surfaceColor?: string;
  highlightColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  menuWidth?: number;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'right';
  popDuration?: number;
  glideDuration?: number;
  rememberPosition?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

type Phase = 'closed' | 'open' | 'closing';

const SIZES: Record<string, { chip: number; row: number; font: number }> = {
  sm: { chip: 28, row: 26, font: 12 },
  md: { chip: 32, row: 30, font: 13 },
  lg: { chip: 44, row: 40, font: 14 }
};
const PAD = 4;
const GAP = 1;
const MENU_GAP = 6;
const DEFAULT_OPTIONS: (string | GlideSelectOption)[] = ['One', 'Two', 'Three'];
const STYLE = '@keyframes gs-swap{from{opacity:.6;filter:blur(2px)}}';

const norm = (o: string | GlideSelectOption): GlideSelectOption => (typeof o === 'string' ? { value: o, label: o } : o);
const textOf = (it: GlideSelectOption) => (typeof it.label === 'string' ? it.label : it.value);
const typeaheadIndex = (items: GlideSelectOption[], from: number, ch: string) => {
  const c = ch.toLowerCase();
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (textOf(items[i]).toLowerCase().startsWith(c)) return i;
  }
  return from;
};

const GlideSelect: React.FC<GlideSelectProps> = ({
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#f5f5f5',
  surfaceColor = '#27272a',
  highlightColor = '#3f3f46',
  textColor = '#f5f5f5',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  placement = 'bottom',
  align = 'left',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = 'Select',
  className = ''
}) => {
  const items = options.map(norm);
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const selected = items.findIndex(it => it.value === current);
  const [phase, setPhase] = useState<Phase>('closed');
  const [active, setActive] = useState<number | null>(null);
  const [side, setSide] = useState<'top' | 'bottom'>(placement);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const instant = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrub = useRef<{ id: number; top: number } | null>(null);
  const id = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const val = it.value.toLowerCase();
      const txt = textOf(it).toLowerCase();
      const tag = (it.tag || '').toLowerCase();
      return val.includes(q) || txt.includes(q) || tag.includes(q);
    });
  }, [items, searchQuery]);

  useEffect(() => {
    if (phase !== 'open') {
      setSearchQuery('');
    } else if (items.length > 8) {
      setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [phase, items.length]);
  const S = SIZES[size] ?? SIZES.md;
  const step = S.row + GAP;
  const popOut = Math.round((popDuration * 2) / 3);

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const el = menuRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const r = root.getBoundingClientRect();
    const need = el.offsetHeight + MENU_GAP;
    setSide(
      placement === 'bottom' && r.bottom + need > window.innerHeight
        ? 'top'
        : placement === 'top' && r.top - need < 0
          ? 'bottom'
          : placement
    );
    el.style.transitionDuration = instant.current ? '0ms' : '';
    el.dataset.state = 'closed';
    void el.offsetHeight;
    el.dataset.state = 'open';
    const p = pillRef.current;
    if (p) {
      p.style.transition = 'none';
      p.style.transform = `translateY(${Math.max(0, selected) * step}px)`;
      p.style.opacity = '0';
      void p.offsetHeight;
      p.style.transition = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useLayoutEffect(() => {
    const p = pillRef.current;
    if (!p || phase !== 'open') return;
    if (active === null) {
      p.style.opacity = '0';
      return;
    }
    const jump = instant.current || p.style.opacity !== '1';
    p.style.transitionDuration = jump ? '0ms, 150ms' : '';
    p.style.transform = `translateY(${active * step}px)`;
    p.style.opacity = '1';
    instant.current = false;
  }, [active, phase, step]);

  const open = (viaKey: boolean) => {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    instant.current = true;
    setActive(selected >= 0 ? selected : viaKey ? 0 : null);
    setPhase('open');
  };
  const close = (mode: 'instant' | 'pop') => {
    setActive(null);
    clearTimeout(closeTimer.current);
    const el = menuRef.current;
    if (mode === 'instant' || !el) {
      setPhase('closed');
      return;
    }
    el.style.transitionDuration = '';
    el.dataset.state = 'closed';
    setPhase('closing');
    closeTimer.current = setTimeout(() => setPhase('closed'), popOut + 20);
  };
  const pickItem = (it: GlideSelectOption, viaKey: boolean) => {
    if (!it) {
      close('instant');
      return;
    }
    if (it.value !== current) {
      if (value === undefined) setInner(it.value);
      onChange?.(it.value, it);
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = '';
    }
    close('instant');
    triggerRef.current?.focus({ preventScroll: true });
  };
  const pick = (i: number, viaKey: boolean) => {
    pickItem(filteredItems[i] || items[i], viaKey);
  };

  const onTriggerKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key;
    const n = items.length;
    const cur = active ?? Math.max(0, selected);
    if (phase !== 'open') {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        open(true);
      }
      return;
    }
    const go = (i: number) => {
      e.preventDefault();
      instant.current = true;
      setActive(Math.min(n - 1, Math.max(0, i)));
    };
    if (k === 'ArrowDown' || k === 'ArrowUp') go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1));
    else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1);
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(cur, true);
    } else if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') e.preventDefault();
      close('instant');
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k));
  };

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close('pop');
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    if (disabled && phase !== 'closed') close('instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const rowAt = (y: number) => {
    const s = scrub.current;
    if (!s) return null;
    const scroll = listRef.current ? listRef.current.scrollTop : 0;
    const i = Math.floor((y - s.top - PAD + scroll) / step);
    return i >= 0 && i < items.length ? i : null;
  };

  useEffect(() => {
    if (phase === 'open' && listRef.current) {
      const targetIndex = active !== null && active >= 0 ? active : selected;
      if (targetIndex >= 0) {
        const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${targetIndex}"]`);
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [phase, active, selected]);
  const onListDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrub.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    scrub.current = { id: e.pointerId, top: e.currentTarget.getBoundingClientRect().top };
    instant.current = true;
    setActive(rowAt(e.clientY));
  };
  const onListMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = rowAt(e.clientY);
    if (i !== active) setActive(i);
  };
  const onListUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = e.type === 'pointerup' ? rowAt(e.clientY) : null;
    scrub.current = null;
    if (i !== null) pick(i, false);
    else if (!rememberPosition) setActive(null);
  };
  const onListOver = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || scrub.current) return;
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!row) return;
    const i = Number(row.dataset.index);
    if (i !== active) setActive(i);
  };

  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align}`;
  return (
    <div
      ref={rootRef}
      className={`group relative inline-block data-[disabled]:opacity-50${className ? ` ${className}` : ''}`}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      style={
        {
          '--gs-accent': accentColor,
          '--gs-surface': surfaceColor,
          '--gs-highlight': highlightColor,
          '--gs-text': textColor,
          '--gs-radius': `${radius}px`,
          '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
          '--gs-chip': `${S.chip}px`,
          '--gs-row': `${S.row}px`,
          '--gs-font': `${S.font}px`,
          '--gs-menu-w': `${menuWidth}px`,
          '--gs-pop': `${popDuration}ms`,
          '--gs-pop-out': `${popOut}ms`,
          '--gs-glide': `${glideDuration}ms`,
          '--gs-origin': origin
        } as CSSProperties
      }
      onAnimationEnd={e => {
        if (e.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap;
      }}
    >
      <style>{STYLE}</style>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === 'open'}
        aria-controls={`${id}-list`}
        aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className="group/trigger relative m-0 inline-flex cursor-pointer touch-manipulation items-center gap-1.5 border-0 pr-2 pl-2.5 leading-none font-medium outline-none select-none [-webkit-tap-highlight-color:transparent] [font-family:inherit] [height:var(--gs-chip)] [border-radius:var(--gs-inner-radius)] [background:var(--gs-surface)] [color:var(--gs-text)] [font-size:var(--gs-font)] [transition:background-color_100ms_ease,transform_160ms_cubic-bezier(0.23,1,0.32,1)] disabled:cursor-default enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100 motion-reduce:[transition:background-color_100ms_ease] aria-expanded:[background:color-mix(in_srgb,var(--gs-highlight)_60%,var(--gs-surface))] [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:[background:color-mix(in_srgb,var(--gs-highlight)_60%,var(--gs-surface))]"
        onPointerDown={e => {
          if (e.button !== 0 || disabled) return;
          e.currentTarget.focus({ preventScroll: true });
          if (phase === 'open') close('pop');
          else open(false);
        }}
        onKeyDown={onTriggerKey}
      >
        <span
          className="data-[empty]:opacity-60 group-data-[swap]:animate-[gs-swap_160ms_ease] motion-reduce:group-data-[swap]:animate-none"
          key={current}
          data-empty={selected < 0 ? '' : undefined}
        >
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <span
          className="inline-flex [color:color-mix(in_srgb,var(--gs-text)_55%,transparent)] [transition:transform_200ms_cubic-bezier(0.23,1,0.32,1)] group-aria-expanded/trigger:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2.5} />
        </span>
      </button>
      {phase !== 'closed' ? (
        <div
          ref={menuRef}
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="absolute z-[100] min-w-full scale-95 p-1 opacity-0 [width:var(--gs-menu-w)] [border-radius:var(--gs-radius)] [background:var(--gs-surface)] border border-[#2a2d3d] [box-shadow:0_8px_24px_rgba(0,0,0,0.45)] [transform-origin:var(--gs-origin)] [transition:opacity_var(--gs-pop)_cubic-bezier(0.23,1,0.32,1),transform_var(--gs-pop)_cubic-bezier(0.23,1,0.32,1)] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=closed]:pointer-events-none data-[state=closed]:[transition-duration:var(--gs-pop-out)] data-[side=bottom]:top-[calc(100%+6px)] data-[side=top]:bottom-[calc(100%+6px)] data-[align=left]:left-0 data-[align=right]:right-0 motion-reduce:[transform:none]! motion-reduce:[transition:opacity_var(--gs-pop)_ease] motion-reduce:data-[state=closed]:[transition-duration:var(--gs-pop-out)]"
          data-state="open"
          data-side={side}
          data-align={align}
        >
          {items.length > 8 && (
            <div className="px-1.5 pt-1 pb-1.5 mb-1 border-b border-white/10 dark:border-white/10">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                <HugeiconsIcon icon={Search01Icon} size={12} className="opacity-50 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className="w-full bg-transparent text-xs text-[var(--gs-text)] placeholder:opacity-40 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    className="text-xs opacity-50 hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="group/list relative grid gap-px max-h-80 overflow-y-auto overscroll-contain pr-1 select-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb]:rounded-full"
            data-live={active !== null ? '' : undefined}
            onPointerOver={onListOver}
            onPointerLeave={() => {
              if (!scrub.current && !rememberPosition) setActive(null);
            }}
            /* Native scrollbar and wheel allowed */
          >
            <span
              ref={pillRef}
              className="pointer-events-none absolute top-0 right-0 left-0 opacity-0 [height:var(--gs-row)] [border-radius:var(--gs-inner-radius)] [background:var(--gs-highlight)] [transition:transform_var(--gs-glide)_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease] motion-reduce:[transition:opacity_150ms_ease]"
              aria-hidden="true"
            />
            {filteredItems.map((it, i) => (
              <div
                key={it.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={it.value === current}
                data-index={i}
                onClick={() => pickItem(it, true)}
                className="relative z-[1] flex cursor-pointer items-center gap-2 pr-2 pl-2.5 select-none [-webkit-tap-highlight-color:transparent] [height:var(--gs-row)] [border-radius:var(--gs-inner-radius)] [color:var(--gs-text)] [font-size:var(--gs-font)] [transition:background-color_100ms_ease] hover:[background:color-mix(in_srgb,var(--gs-highlight)_60%,transparent)] aria-selected:[background:color-mix(in_srgb,var(--gs-highlight)_70%,transparent)]"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                {showTags && it.tag ? (
                  <span className="shrink-0 [color:color-mix(in_srgb,var(--gs-text)_55%,transparent)] [font-size:calc(var(--gs-font)_-_2px)]">
                    {it.tag}
                  </span>
                ) : null}
                <span
                  className="inline-flex shrink-0 invisible [color:var(--gs-accent)] data-[on]:visible"
                  data-on={it.value === current ? '' : undefined}
                  aria-hidden="true"
                >
                  <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GlideSelect;
