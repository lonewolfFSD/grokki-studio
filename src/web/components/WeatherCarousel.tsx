import React, { useRef, useState, useEffect } from 'react';
import {
  Sun,
  Cloud,
  Cloudy,
  CloudSun,
  CloudSunRain,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  CloudMoon,
  CloudMoonRain,
  Snowflake,
  Wind,
  Droplets,
  MapPin,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';

export interface WeatherForecastItem {
  timeOrDay: string;
  temp: string;
  condition: string;
  rainChance?: string;
  wind?: string;
  high?: string;
  low?: string;
  humidity?: string;
  isNight?: boolean;
}

export interface WeatherData {
  location?: string;
  currentTemp?: string;
  feelsLike?: string;
  condition?: string;
  high?: string;
  low?: string;
  items: WeatherForecastItem[];
  rawTableText?: string;
}

interface WeatherCarouselProps {
  data: WeatherData;
}

/**
 * Returns natural, refined Lucide weather icon and clean color (no neon slop).
 */
function getWeatherIcon(condition = '', isNight = false, rainChance?: string) {
  const c = condition.toLowerCase();

  if (c.includes('thunder') || c.includes('lightning') || c.includes('storm')) {
    return {
      Icon: CloudLightning,
      color: 'text-amber-400 dark:text-amber-300',
      label: condition || 'Thunderstorm',
    };
  }

  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard') || c.includes('ice') || c.includes('flurries')) {
    return {
      Icon: Snowflake,
      color: 'text-cyan-400 dark:text-cyan-300',
      label: condition || 'Snow',
    };
  }

  if (c.includes('heavy rain') || c.includes('downpour') || c.includes('torrential')) {
    return {
      Icon: CloudRain,
      color: 'text-blue-500 dark:text-blue-400',
      label: condition || 'Heavy Rain',
    };
  }

  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower') || c.includes('patchy')) {
    return {
      Icon: isNight ? CloudMoonRain : CloudSunRain,
      color: 'text-sky-400 dark:text-sky-300',
      label: condition || 'Rain Showers',
    };
  }

  if (c.includes('fog') || c.includes('mist') || c.includes('haze') || c.includes('smog')) {
    return {
      Icon: CloudFog,
      color: 'text-zinc-400 dark:text-zinc-400',
      label: condition || 'Foggy',
    };
  }

  if (c.includes('cloud') || c.includes('overcast')) {
    if (c.includes('partly') || c.includes('scattered') || c.includes('broken')) {
      return {
        Icon: isNight ? CloudMoon : CloudSun,
        color: isNight ? 'text-indigo-300' : 'text-amber-400 dark:text-amber-300',
        label: condition || 'Partly Cloudy',
      };
    }
    return {
      Icon: Cloudy,
      color: 'text-zinc-400 dark:text-zinc-300',
      label: condition || 'Overcast',
    };
  }

  if (c.includes('wind') || c.includes('breeze') || c.includes('gale')) {
    return {
      Icon: Wind,
      color: 'text-teal-400 dark:text-teal-300',
      label: condition || 'Windy',
    };
  }

  if (c.includes('clear') || c.includes('sunny') || c.includes('fair')) {
    if (isNight) {
      return {
        Icon: CloudMoon,
        color: 'text-indigo-300',
        label: condition || 'Clear Night',
      };
    }
    return {
      Icon: Sun,
      color: 'text-amber-400 dark:text-amber-300',
      label: condition || 'Sunny',
    };
  }

  const parsedRain = rainChance ? parseInt(rainChance.replace(/\D/g, ''), 10) : 0;
  if (parsedRain >= 50) {
    return {
      Icon: CloudRain,
      color: 'text-sky-400 dark:text-sky-300',
      label: 'Rain Expected',
    };
  }
  if (parsedRain >= 20) {
    return {
      Icon: isNight ? CloudMoonRain : CloudSunRain,
      color: 'text-sky-400 dark:text-sky-300',
      label: 'Passing Showers',
    };
  }

  return {
    Icon: isNight ? CloudMoon : Sun,
    color: isNight ? 'text-indigo-300' : 'text-amber-400 dark:text-amber-300',
    label: isNight ? 'Clear Night' : 'Mostly Clear',
  };
}

/**
 * Parses temperature values into primary high / low for clean Apple Weather styling.
 */
function parseTemperatureDisplay(tempStr = '') {
  if (!tempStr) return { primary: '--', secondary: null, isRange: false };
  const clean = tempStr.trim();

  // Check ranges like "27°C - 33°C", "27° - 33°", "27 - 33°C", "27/33"
  const rangeMatch = clean.match(/(\d+)\s*(?:°\s*[CF]?)?\s*(?:-|–|—|\/|to)\s*(\d+)\s*(?:°\s*([CF]?))?/i);
  if (rangeMatch) {
    const num1 = parseInt(rangeMatch[1], 10);
    const num2 = parseInt(rangeMatch[2], 10);
    const low = Math.min(num1, num2);
    const high = Math.max(num1, num2);
    const unit = rangeMatch[3] ? `°${rangeMatch[3].toUpperCase()}` : '°';
    return {
      primary: `${high}${unit}`,
      secondary: `${low}${unit}`,
      isRange: true,
    };
  }

  // Single temp like "24 °C", "29°"
  const singleMatch = clean.match(/(\d+)\s*(?:°\s*([CF]?))?/i);
  if (singleMatch) {
    const unit = singleMatch[2] ? `°${singleMatch[2].toUpperCase()}` : '°';
    return {
      primary: `${singleMatch[1]}${unit}`,
      secondary: null,
      isRange: false,
    };
  }

  return { primary: clean, secondary: null, isRange: false };
}

/**
 * Checks if a time string corresponds to night hours.
 */
function isTimeNight(timeStr = '') {
  const t = timeStr.toLowerCase();
  if (t.includes('night') || t.includes('tonight') || t.includes('evening') || t.includes('late')) return true;
  const pmMatch = t.match(/(\d{1,2})(?::\d{2})?\s*pm/);
  if (pmMatch) {
    const hr = parseInt(pmMatch[1], 10);
    if (hr >= 6 && hr <= 11) return true;
  }
  const amMatch = t.match(/(\d{1,2})(?::\d{2})?\s*am/);
  if (amMatch) {
    const hr = parseInt(amMatch[1], 10);
    if (hr === 12 || (hr >= 1 && hr <= 5)) return true;
  }
  return false;
}

/**
 * Parses weather forecast tables or lists from assistant markdown responses.
 */
export function parseWeatherForecastFromMarkdown(content = ''): WeatherData | null {
  if (!content || typeof content !== 'string') return null;

  const hasWeatherTerms = /(?:°\s*[CF]|weather|forecast|temperature|rain|precipitation|hourly|wind\s*speed)/i.test(content);
  if (!hasWeatherTerms) return null;

  const lines = content.split('\n');
  let tableHeaderIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      const isTimeCol = cols.some((c) => /time|hour|day|date|forecast|period/i.test(c));
      const isWeatherCol = cols.some((c) => /temp|rain|precip|wind|condition|weather|sky/i.test(c));
      if (isTimeCol && isWeatherCol) {
        tableHeaderIndex = i;
        headers = cols.map((c) => c.toLowerCase());
        break;
      }
    }
  }

  let location: string | undefined;
  const locMatch = content.match(/(?:current\s+weather|weather\s+forecast|weather\s+in|weather\s+report\s+for)\s+(?:in|for)?\s*([A-Za-z\s,]+?)(?:\n|:|\.|,|\(|is expected)/i);
  if (locMatch && locMatch[1]) {
    const rawLoc = locMatch[1].trim().replace(/^(today'?s|the)\s+/i, '');
    if (rawLoc.length >= 2 && !/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(rawLoc)) {
      location = rawLoc;
    }
  }

  let currentTemp: string | undefined;
  let feelsLike: string | undefined;
  let summaryCondition: string | undefined;

  const tempMatch = content.match(/(?:temperature\s+of|currently|temp(?:erature)?\s*is|expected\s+to\s+be[^\n\d]*)\s*(\d+\s*°\s*[CF]|\d+\s*°)/i);
  if (tempMatch) currentTemp = tempMatch[1].replace(/\s+/g, '');

  const feelsMatch = content.match(/feels[ -]?like\s+(?:temperature\s+is\s+)?(\d+\s*°\s*[CF]|\d+\s*°)/i);
  if (feelsMatch) feelsLike = feelsMatch[1].replace(/\s+/g, '');

  const condMatch = content.match(/(?:weather\s+in[^\n]+is\s+expected\s+to\s+be|condition\s+is)\s+([A-Za-z\s]+?)(?:\s+with\s+a\s+temperature|\.|\,)/i);
  if (condMatch) summaryCondition = condMatch[1].trim();

  if (tableHeaderIndex !== -1) {
    const timeIdx = headers.findIndex((h) => /time|hour|day|date|period/i.test(h));
    const condIdx = headers.findIndex((h) => /condition|weather|sky|forecast/i.test(h));
    const tempIdx = headers.findIndex((h) => /temp|temperature|high|feels/i.test(h));
    const rainIdx = headers.findIndex((h) => /rain|precip|chance/i.test(h));
    const windIdx = headers.findIndex((h) => /wind/i.test(h));
    const humidIdx = headers.findIndex((h) => /humid/i.test(h));

    const items: WeatherForecastItem[] = [];
    const tableLines: string[] = [];

    for (let i = tableHeaderIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('|')) break;
      tableLines.push(lines[i]);
      if (line.includes('---')) continue;
      if (i === tableHeaderIndex) continue;

      const cols = line.split('|').map((c) => c.trim().replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '')).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cols.length < 2) continue;

      const timeOrDay = timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx] : cols[0];
      const condition = condIdx !== -1 && cols[condIdx] ? cols[condIdx] : (summaryCondition || '');
      const temp = tempIdx !== -1 && cols[tempIdx] ? cols[tempIdx] : '';
      const rain = rainIdx !== -1 && cols[rainIdx] ? cols[rainIdx] : '';
      const wind = windIdx !== -1 && cols[windIdx] ? cols[windIdx] : '';
      const humidity = humidIdx !== -1 && cols[humidIdx] ? cols[humidIdx] : '';

      const isNight = isTimeNight(timeOrDay);

      items.push({
        timeOrDay,
        temp,
        condition,
        rainChance: rain,
        wind,
        humidity,
        isNight,
      });
    }

    if (items.length >= 2) {
      return {
        location,
        currentTemp,
        feelsLike,
        condition: summaryCondition,
        items,
        rawTableText: tableLines.join('\n'),
      };
    }
  }

  // Fallback: bullet-list forecasts
  const listItems: WeatherForecastItem[] = [];
  const listRegex = /(?:^|\n)\s*[-*•]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Today|Tomorrow|Tonight)\s*[:\-–]\s*(.+)/gi;
  let match: RegExpExecArray | null;

  while ((match = listRegex.exec(content)) !== null) {
    const timeOrDay = match[1].trim();
    const rest = match[2].trim();
    const tempM = rest.match(/(\d+\s*°\s*[CF]|\d+\s*°)/i);
    const rainM = rest.match(/(\d+%\s*(?:rain|precip|chance)?)/i);
    const windM = rest.match(/(\d+\s*(?:km\/h|mph|knots))/i);

    let cleanCond = rest
      .replace(/(\d+\s*°\s*[CF]|\d+\s*°)/gi, '')
      .replace(/(\d+%\s*(?:rain|precip|chance)?)/gi, '')
      .replace(/(\d+\s*(?:km\/h|mph|knots))/gi, '')
      .replace(/[,;–\-|]+/g, ' ')
      .trim();

    listItems.push({
      timeOrDay,
      temp: tempM ? tempM[1] : '',
      condition: cleanCond || summaryCondition || 'Clear',
      rainChance: rainM ? rainM[1] : undefined,
      wind: windM ? windM[1] : undefined,
      isNight: isTimeNight(timeOrDay),
    });
  }

  if (listItems.length >= 2) {
    return {
      location,
      currentTemp,
      feelsLike,
      condition: summaryCondition,
      items: listItems,
    };
  }

  return null;
}

/**
 * Strips the parsed forecast table from message markdown so it doesn't render duplicate raw text under the carousel.
 */
export function stripWeatherTableFromMarkdown(content = '', data: WeatherData): string {
  if (!content || !data) return content;
  let clean = content;

  if (data.rawTableText) {
    clean = clean.replace(data.rawTableText, '');
    clean = clean.replace(/(?:Here's\s+a\s+breakdown\s+of\s+the\s+hourly\s+forecast[^\n]*\n*)/gi, '');
    clean = clean.replace(/(?:Hourly\s+Forecast\s*\n*)/gi, '');
  }

  return clean.replace(/\n{3,}/g, '\n\n').trim();
}

export const WeatherCarousel: React.FC<WeatherCarouselProps> = ({ data }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [data.items.length, viewMode]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -300 : 300;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!data.items || data.items.length === 0) return null;

  return (
    <div className="relative group/weather my-4 select-none font-sans">
      {/* Sleek Minimal Header */}
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <CloudSun className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 tracking-tight">
            Weather Forecast
          </span>

          {data.location && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 shrink-0">
              <MapPin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              <span className="truncate max-w-[160px]">{data.location}</span>
            </span>
          )}

          {data.currentTemp && (
            <span className="hidden sm:inline-flex text-xs text-zinc-400 dark:text-zinc-500 font-normal">
              · Currently <strong className="text-zinc-800 dark:text-zinc-200 ml-1 font-semibold">{data.currentTemp}</strong>
              {data.feelsLike && <span className="ml-1 text-zinc-400">(feels {data.feelsLike})</span>}
            </span>
          )}
        </div>

        {/* Minimal View Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title="Card Reel"
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden md:inline">Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Table View"
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-3 h-3" />
            <span className="hidden md:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Cards Reel View - Apple / Linear Clean Aesthetic */}
      {viewMode === 'cards' ? (
        <div className="relative">
          {/* Scroll Controls */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-[#11131a]/95 backdrop-blur-md border border-zinc-200 dark:border-white/15 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-[#11131a]/95 backdrop-blur-md border border-zinc-200 dark:border-white/15 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 px-0.5"
          >
            {data.items.map((item, idx) => {
              const visual = getWeatherIcon(item.condition, item.isNight, item.rainChance);
              const VisualIcon = visual.Icon;
              const tempInfo = parseTemperatureDisplay(item.temp);

              return (
                <div
                  key={`${item.timeOrDay}-${idx}`}
                  className="relative shrink-0 snap-start w-38 sm:w-42 rounded-2xl bg-white/80 dark:bg-[#11131a]/70 backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 p-4 flex flex-col justify-between transition-all duration-200 group shadow-xs hover:shadow-md"
                >
                  {/* Top: Day or Time */}
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {item.timeOrDay}
                    </span>
                    {item.isNight && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                        Night
                      </span>
                    )}
                  </div>

                  {/* Middle: Icon & Temperature */}
                  <div className="flex flex-col items-center my-2 text-center">
                    <div className="my-1.5 transition-transform duration-300 group-hover:scale-105">
                      <VisualIcon className={`w-8 h-8 ${visual.color}`} strokeWidth={1.75} />
                    </div>

                    {tempInfo.isRange ? (
                      <div className="flex flex-col items-center gap-1.5 my-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            {tempInfo.primary}
                          </span>
                          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                            {tempInfo.secondary}
                          </span>
                        </div>
                        {/* Apple Weather gradient range bar */}
                        <div className="w-14 h-1 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-orange-400" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white my-1">
                        {tempInfo.primary}
                      </div>
                    )}

                    {/* Condition Text (Clean, no clipped pills) */}
                    <p className="text-[11px] leading-snug font-medium text-zinc-600 dark:text-zinc-300 text-center line-clamp-2 mt-1 min-h-[26px]">
                      {item.condition || visual.label}
                    </p>
                  </div>

                  {/* Bottom: Clean Rain & Wind Row */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1" title="Precipitation chance">
                      <Droplets className={`w-3 h-3 ${item.rainChance && item.rainChance !== '0%' ? 'text-sky-400' : 'text-zinc-400 opacity-50'}`} />
                      <span className="font-mono text-[11px]">{item.rainChance || '0%'}</span>
                    </div>

                    <div className="flex items-center gap-1" title="Wind speed">
                      <Wind className="w-3 h-3 text-zinc-400 opacity-60" />
                      <span className="font-mono text-[11px]">{item.wind || '--'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Minimal Table View */
        <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] overflow-hidden bg-white/80 dark:bg-[#11131a]/70 backdrop-blur-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200/80 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5 font-medium">Time / Day</th>
                <th className="py-2.5 px-3.5 font-medium">Condition</th>
                <th className="py-2.5 px-3.5 font-medium">Temp</th>
                <th className="py-2.5 px-3.5 font-medium">Rain</th>
                <th className="py-2.5 px-3.5 font-medium">Wind</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
              {data.items.map((item, idx) => {
                const visual = getWeatherIcon(item.condition, item.isNight, item.rainChance);
                const VisualIcon = visual.Icon;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2 px-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.timeOrDay}
                    </td>
                    <td className="py-2 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <VisualIcon className={`w-3.5 h-3.5 ${visual.color} shrink-0`} />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.condition || visual.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3.5 font-semibold text-zinc-900 dark:text-white">
                      {item.temp || '--'}
                    </td>
                    <td className="py-2 px-3.5 text-sky-500 dark:text-sky-400 font-mono text-[11px]">
                      {item.rainChance || '0%'}
                    </td>
                    <td className="py-2 px-3.5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                      {item.wind || '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
