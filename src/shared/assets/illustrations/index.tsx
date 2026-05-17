export function NotesIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="35" width="110" height="135" rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <rect x="45" y="35" width="18" height="135" rx="4" fill="var(--color-accent)" opacity="0.3"/>
      <line x1="75" y1="75" x2="140" y2="75" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="75" y1="95" x2="140" y2="95" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="75" y1="115" x2="120" y2="115" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <rect x="130" y="120" width="8" height="40" rx="2" transform="rotate(-30 130 120)" fill="var(--color-accent)" opacity="0.8"/>
      <circle cx="148" cy="62" r="8" fill="var(--color-accent)" opacity="0.2"/>
      <circle cx="148" cy="62" r="4" fill="var(--color-accent)" opacity="0.6"/>
    </svg>
  )
}

export function TasksIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="40" width="120" height="120" rx="12" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <rect x="58" y="68" width="18" height="18" rx="4" stroke="var(--color-accent)" strokeWidth="2"/>
      <path d="M62 78L67 83L74 72" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="86" y1="77" x2="140" y2="77" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <rect x="58" y="98" width="18" height="18" rx="4" stroke="var(--color-text-tertiary)" strokeWidth="2"/>
      <line x1="86" y1="107" x2="130" y2="107" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <rect x="58" y="128" width="18" height="18" rx="4" stroke="var(--color-text-tertiary)" strokeWidth="2"/>
      <line x1="86" y1="137" x2="120" y2="137" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="150" cy="50" r="16" fill="var(--color-accent)" opacity="0.15"/>
      <path d="M145 50L149 54L156 46" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function KanbanIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="45" width="45" height="110" rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.8"/>
      <rect x="78" y="45" width="45" height="110" rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="1.5"/>
      <rect x="131" y="45" width="45" height="110" rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.8"/>
      <rect x="33" y="60" width="30" height="22" rx="4" fill="var(--color-accent)" opacity="0.3"/>
      <rect x="33" y="88" width="30" height="16" rx="4" fill="var(--color-accent)" opacity="0.15"/>
      <rect x="86" y="60" width="30" height="28" rx="4" fill="var(--color-accent)" opacity="0.4"/>
      <rect x="86" y="94" width="30" height="18" rx="4" fill="var(--color-accent)" opacity="0.2"/>
      <rect x="86" y="118" width="30" height="14" rx="4" fill="var(--color-accent)" opacity="0.1"/>
      <rect x="139" y="60" width="30" height="18" rx="4" fill="var(--color-accent)" opacity="0.25"/>
      <line x1="25" y1="55" x2="70" y2="55" stroke="var(--color-text-tertiary)" strokeWidth="1"/>
      <line x1="78" y1="55" x2="123" y2="55" stroke="var(--color-text-tertiary)" strokeWidth="1"/>
      <line x1="131" y1="55" x2="176" y2="55" stroke="var(--color-text-tertiary)" strokeWidth="1"/>
    </svg>
  )
}

export function FlowsIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="55" r="18" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <circle cx="60" cy="120" r="14" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <circle cx="140" cy="120" r="14" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <circle cx="100" cy="160" r="12" fill="var(--color-accent)" opacity="0.3" stroke="var(--color-accent)" strokeWidth="2"/>
      <path d="M90 68L65 108" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M110 68L135 108" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M68 132L92 152" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M132 132L108 152" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <circle cx="100" cy="55" r="6" fill="var(--color-accent)" opacity="0.5"/>
    </svg>
  )
}

export function VaultIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="50" width="110" height="100" rx="10" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <rect x="55" y="50" width="90" height="20" rx="5" fill="var(--color-accent)" opacity="0.2"/>
      <circle cx="100" cy="110" r="16" stroke="var(--color-accent)" strokeWidth="2.5"/>
      <circle cx="100" cy="110" r="4" fill="var(--color-accent)"/>
      <path d="M100 98V105" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/>
      <rect x="60" y="135" width="80" height="4" rx="2" fill="var(--color-accent)" opacity="0.15"/>
    </svg>
  )
}

export function CaptureIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="40" width="100" height="120" rx="10" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <path d="M75 80L95 80" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M75 96L120" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M75 112L110 112" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="135" cy="55" r="14" fill="var(--color-accent)" opacity="0.2" stroke="var(--color-accent)" strokeWidth="2"/>
      <path d="M135 49V61M129 55H141" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M70 128L82 128" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <rect x="68" y="70" width="6" height="6" rx="1.5" fill="var(--color-accent)" opacity="0.4"/>
    </svg>
  )
}

export function CalendarIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="50" width="120" height="110" rx="10" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <rect x="40" y="50" width="120" height="28" rx="10" fill="var(--color-accent)" opacity="0.2"/>
      <line x1="72" y1="42" x2="72" y2="58" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="128" y1="42" x2="128" y2="58" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"/>
      {[0,1,2,3,4].map(r => [0,1,2,3,4,5,6].map(c => (
        <rect key={`${r}${c}`} x={52+c*15} y={90+r*13} width="8" height="8" rx="2"
          fill={r===1&&c===2 ? "var(--color-accent)" : "var(--color-text-tertiary)"} opacity={r===1&&c===2 ? 0.8 : 0.15}/>
      )))}
    </svg>
  )
}

export function VoiceIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="88" y="40" width="24" height="60" rx="12" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <path d="M68 85C68 102.7 82.3 117 100 117C117.7 117 132 102.7 132 85" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <line x1="100" y1="117" x2="100" y2="140" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="82" y1="140" x2="118" y2="140" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round"/>
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={52+i*14} y={155} width="6" height={10+Math.sin(i*1.2)*10} rx="3"
          fill="var(--color-accent)" opacity={0.2+i*0.08} transform={`translate(0, ${-(10+Math.sin(i*1.2)*10)/2})`}/>
      ))}
    </svg>
  )
}

export function SearchEmptyIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="85" r="35" stroke="var(--color-accent)" strokeWidth="2.5" fill="var(--color-bg-secondary)"/>
      <line x1="115" y1="110" x2="145" y2="140" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="90" cy="85" r="15" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.3"/>
      <path d="M82 85H98" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="145" cy="140" r="6" fill="var(--color-accent)" opacity="0.3"/>
    </svg>
  )
}

export function WelcomeIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <circle cx="100" cy="100" r="30" fill="var(--color-accent)" opacity="0.15"/>
      <path d="M85 105L96 116L118 88" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="50" cy="55" r="8" fill="var(--color-accent)" opacity="0.15"/>
      <circle cx="155" cy="60" r="6" fill="var(--color-accent)" opacity="0.1"/>
      <circle cx="145" cy="150" r="10" fill="var(--color-accent)" opacity="0.1"/>
      <circle cx="55" cy="145" r="5" fill="var(--color-accent)" opacity="0.2"/>
    </svg>
  )
}

export function LevelUpIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="100,30 120,75 170,80 132,115 142,162 100,138 58,162 68,115 30,80 80,75"
        fill="var(--color-accent)" opacity="0.15" stroke="var(--color-accent)" strokeWidth="2"/>
      <polygon points="100,55 110,78 135,82 118,98 122,124 100,112 78,124 82,98 65,82 90,78"
        fill="var(--color-accent)" opacity="0.3"/>
      <circle cx="100" cy="92" r="12" fill="var(--color-accent)" opacity="0.5"/>
      <path d="M95 92L99 96L106 88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function AnalyticsIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="45" width="130" height="110" rx="10" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <rect x="55" y="95" width="16" height="40" rx="4" fill="var(--color-accent)" opacity="0.3"/>
      <rect x="80" y="75" width="16" height="60" rx="4" fill="var(--color-accent)" opacity="0.5"/>
      <rect x="105" y="85" width="16" height="50" rx="4" fill="var(--color-accent)" opacity="0.4"/>
      <rect x="130" y="65" width="16" height="70" rx="4" fill="var(--color-accent)" opacity="0.6"/>
      <line x1="50" y1="140" x2="152" y2="140" stroke="var(--color-text-tertiary)" strokeWidth="1.5"/>
      <path d="M55 110Q80 85 100 95Q120 105 145 70" stroke="var(--color-accent)" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export function ShareIllustration({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="140" cy="60" r="16" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <circle cx="60" cy="100" r="16" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <circle cx="140" cy="140" r="16" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="2"/>
      <path d="M75 92L126 66" stroke="var(--color-accent)" strokeWidth="2" opacity="0.5"/>
      <path d="M75 108L126 134" stroke="var(--color-accent)" strokeWidth="2" opacity="0.5"/>
      <circle cx="140" cy="60" r="6" fill="var(--color-accent)" opacity="0.4"/>
      <circle cx="60" cy="100" r="6" fill="var(--color-accent)" opacity="0.4"/>
      <circle cx="140" cy="140" r="6" fill="var(--color-accent)" opacity="0.4"/>
    </svg>
  )
}
