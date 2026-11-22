type IconName = 'tag' | 'plus' | 'pencil' | 'search' | 'sun' | 'moon' | 'x' | 'shield' | 'sliders' | 'calendar' | 'ticket' | 'menu'

const PATHS: Record<IconName, React.ReactNode> = {
  tag: (
    <>
      <path d="M12.6 2.7H3.4A1.4 1.4 0 0 0 2 4.1v9.2c0 .4.1.7.4 1l8.7 8.7a1.4 1.4 0 0 0 2 0l9.2-9.2a1.4 1.4 0 0 0 0-2L13.6 3.1a1.4 1.4 0 0 0-1-.4Z" />
      <circle cx="7.2" cy="7.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  pencil: (
    <>
      <path d="M12.5 6.5 17.5 11.5" />
      <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M16 4v4" />
      <path d="M4 12h2" />
      <path d="M10 12h10" />
      <path d="M8 10v4" />
      <path d="M4 18h6" />
      <path d="M14 18h6" />
      <path d="M12 16v4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M12 6v12" />
    </>
  ),
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
