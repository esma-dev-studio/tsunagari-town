import type { SVGProps } from 'react'

export type IconName =
  | 'arrow' | 'back' | 'book' | 'briefcase' | 'bus' | 'check' | 'coin'
  | 'community' | 'heart' | 'home' | 'info' | 'map' | 'menu' | 'pause'
  | 'piggy' | 'play' | 'reset' | 'shop' | 'speaker' | 'sprout' | 'tools'
  | 'wallet' | 'waste' | 'weather' | 'x'

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14M14 6l6 6-6 6" /></>,
    back: <><path d="M19 12H5M10 6l-6 6 6 6" /></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    bus: <><rect x="4" y="3" width="16" height="17" rx="3" /><path d="M7 20v2M17 20v2M4 12h16M7 7h10" /><circle cx="8" cy="16" r="1" /><circle cx="16" cy="16" r="1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M9 8.5h4a2 2 0 0 1 0 4h-2a2 2 0 0 0 0 4h4M12 6v12" /></>,
    community: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.4-4.2 2.3-6.3 5.5-6.3s5.1 2.1 5.5 6.3M14 14.5c3.8-.8 6.3 1 7 4.8" /></>,
    heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8z" />,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></>,
    info: <><circle cx="12" cy="12" r="10" /><path d="M12 11v6M12 7h.01" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    piggy: <><path d="M5 11c.8-4 4-6 8-6 4.8 0 8 2.9 8 7 0 2.5-1.2 4.4-3 5.5V21h-3v-2H9v2H6v-3.2A7 7 0 0 1 3 12H1v-3h4z" /><path d="M14 9h.01M7 6 5 3c3-.5 5 .4 6 2" /></>,
    play: <path d="m8 5 11 7-11 7z" />,
    reset: <><path d="M4 4v6h6" /><path d="M5.5 15a8 8 0 1 0 1-8L4 10" /></>,
    shop: <><path d="M4 10v11h16V10M3 4h18l-2 6H5z" /><path d="M9 21v-6h6v6" /></>,
    speaker: <><path d="M5 9H2v6h3l5 4V5z" /><path d="M14 9a4 4 0 0 1 0 6M17 6a8 8 0 0 1 0 12" /></>,
    sprout: <><path d="M12 22V10" /><path d="M12 14C6 14 3 11 3 5c6 0 9 3 9 9zM12 11c0-5 3-8 9-8 0 6-3 9-9 9" /></>,
    tools: <><path d="m14 6 4-4 4 4-4 4M13 7l-9 9a3 3 0 0 0 4 4l9-9" /><path d="m3 3 6 6" /></>,
    wallet: <><path d="M3 6a3 3 0 0 1 3-3h13v18H6a3 3 0 0 1-3-3z" /><path d="M3 7h16M14 11h8v6h-8a3 3 0 0 1 0-6z" /></>,
    waste: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    weather: <><path d="M7 15a4 4 0 1 1 1-7.9A6 6 0 0 1 19 10a3 3 0 0 1 0 6H7z" /><path d="M9 19l-1 2M14 19l-1 2M19 19l-1 2" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common} {...props}>{paths[name]}</svg>
}
