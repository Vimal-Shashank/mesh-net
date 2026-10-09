import { TerminalPalette, ThemeMode } from '../types';

export interface PaletteTheme {
  id: TerminalPalette;
  name: string;
  badge: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverBgClass: string;
  accentClass: string;
  headerBg: string;
  promptPrefix: string;
  hexColor: string;
  // Light mode equivalents
  lightBgClass?: string;
  lightTextClass?: string;
  lightBorderClass?: string;
  lightHoverBgClass?: string;
  lightAccentClass?: string;
  lightHeaderBg?: string;
  lightHexColor?: string;
}

export const PALETTES: Record<TerminalPalette, PaletteTheme> = {
  emerald: {
    id: 'emerald',
    name: 'Matrix Emerald',
    badge: 'VT100 Green',
    bgClass: 'bg-zinc-950',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    hoverBgClass: 'hover:bg-emerald-950/60',
    accentClass: 'text-emerald-300',
    headerBg: 'bg-zinc-950',
    promptPrefix: 'text-emerald-500',
    hexColor: '#34d399',
    lightBgClass: 'bg-emerald-50/50',
    lightTextClass: 'text-emerald-950',
    lightBorderClass: 'border-emerald-600/30',
    lightHoverBgClass: 'hover:bg-emerald-100/70',
    lightAccentClass: 'text-emerald-700',
    lightHeaderBg: 'bg-emerald-100/70',
    lightHexColor: '#059669',
  },
  amber: {
    id: 'amber',
    name: 'Amber CRT Gold',
    badge: 'VT220 Amber',
    bgClass: 'bg-zinc-950',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    hoverBgClass: 'hover:bg-amber-950/60',
    accentClass: 'text-amber-300',
    headerBg: 'bg-zinc-950',
    promptPrefix: 'text-amber-500',
    hexColor: '#fbbf24',
    lightBgClass: 'bg-amber-50/60',
    lightTextClass: 'text-amber-950',
    lightBorderClass: 'border-amber-600/30',
    lightHoverBgClass: 'hover:bg-amber-100/70',
    lightAccentClass: 'text-amber-800',
    lightHeaderBg: 'bg-amber-100/70',
    lightHexColor: '#d97706',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    badge: 'Neon Cyan/Pink',
    bgClass: 'bg-zinc-950',
    textClass: 'text-cyan-400',
    borderClass: 'border-pink-500/30',
    hoverBgClass: 'hover:bg-pink-950/60',
    accentClass: 'text-pink-400',
    headerBg: 'bg-zinc-950',
    promptPrefix: 'text-pink-500',
    hexColor: '#22d3ee',
    lightBgClass: 'bg-slate-50',
    lightTextClass: 'text-slate-900',
    lightBorderClass: 'border-pink-500/30',
    lightHoverBgClass: 'hover:bg-pink-50',
    lightAccentClass: 'text-pink-700',
    lightHeaderBg: 'bg-slate-100',
    lightHexColor: '#0891b2',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Phosphor White',
    badge: 'DEC VT100 White',
    bgClass: 'bg-zinc-950',
    textClass: 'text-zinc-100',
    borderClass: 'border-zinc-700/50',
    hoverBgClass: 'hover:bg-zinc-800/60',
    accentClass: 'text-zinc-300',
    headerBg: 'bg-zinc-950',
    promptPrefix: 'text-zinc-400',
    hexColor: '#f4f4f5',
    lightBgClass: 'bg-white',
    lightTextClass: 'text-slate-900',
    lightBorderClass: 'border-slate-300',
    lightHoverBgClass: 'hover:bg-slate-100',
    lightAccentClass: 'text-slate-700',
    lightHeaderBg: 'bg-slate-50',
    lightHexColor: '#334155',
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized Dark',
    badge: 'Solarized Cyan',
    bgClass: 'bg-[#002b36]',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/30',
    hoverBgClass: 'hover:bg-[#073642]',
    accentClass: 'text-yellow-400',
    headerBg: 'bg-[#00212b]',
    promptPrefix: 'text-yellow-500',
    hexColor: '#2aa198',
    lightBgClass: 'bg-[#fdf6e3]',
    lightTextClass: 'text-[#073642]',
    lightBorderClass: 'border-[#93a1a1]/50',
    lightHoverBgClass: 'hover:bg-[#eee8d5]',
    lightAccentClass: 'text-[#b58900]',
    lightHeaderBg: 'bg-[#eee8d5]',
    lightHexColor: '#268bd2',
  },
};

export function getPaletteTheme(palette: TerminalPalette, themeMode: ThemeMode = 'dark'): PaletteTheme {
  const base = PALETTES[palette] || PALETTES.emerald;
  if (themeMode === 'light') {
    return {
      ...base,
      bgClass: base.lightBgClass || 'bg-slate-50',
      textClass: base.lightTextClass || 'text-slate-900',
      borderClass: base.lightBorderClass || 'border-slate-300',
      hoverBgClass: base.lightHoverBgClass || 'hover:bg-slate-100',
      accentClass: base.lightAccentClass || 'text-emerald-700',
      headerBg: base.lightHeaderBg || 'bg-white',
      hexColor: base.lightHexColor || base.hexColor,
    };
  }
  return base;
}
