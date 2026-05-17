/**
 * Delay branded SVG icons — indigo (#6366F1), white (#FFFFFF), skyblue (#06B6D4).
 * Used in templates, lists, and anywhere we replace generic emojis.
 */

interface DelayIconProps {
  name: string;
  size?: number;
  className?: string;
}

const PATHS: Record<string, { d: string; fill: string; stroke?: string }[]> = {
  blank: [
    { d: "M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", fill: "none", stroke: "#6366F1" },
    { d: "M14 2v4h4", fill: "none", stroke: "#06B6D4" },
    { d: "M8 13h8M8 17h5", fill: "none", stroke: "#6366F1" },
  ],
  journal: [
    { d: "M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z", fill: "none", stroke: "#6366F1" },
    { d: "M12 2v4", fill: "none", stroke: "#06B6D4" },
    { d: "M8 8h8M8 12h8M8 16h4", fill: "none", stroke: "#6366F1" },
    { d: "M16 16l2 2", fill: "none", stroke: "#06B6D4" },
  ],
  meeting: [
    { d: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2", fill: "none", stroke: "#6366F1" },
    { d: "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", fill: "none", stroke: "#6366F1" },
    { d: "M21 11l-3-3m0 6l3-3", fill: "none", stroke: "#06B6D4" },
  ],
  project: [
    { d: "M2 20h20M6 16V8M12 16V4M18 16V10", fill: "none", stroke: "#6366F1" },
    { d: "M12 4l-2 2 2 2 2-2-2-2z", fill: "#06B6D4", stroke: "#06B6D4" },
  ],
  brainstorm: [
    { d: "M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z", fill: "none", stroke: "#6366F1" },
    { d: "M9 21h6", fill: "none", stroke: "#06B6D4" },
    { d: "M12 6v2", fill: "none", stroke: "#FFFFFF" },
    { d: "M10 10h4", fill: "none", stroke: "#06B6D4" },
  ],
  recipe: [
    { d: "M12 2C8 2 4 6 4 10c0 3 2 6 4 7v3h8v-3c2-1 4-4 4-7 0-4-4-8-8-8z", fill: "none", stroke: "#6366F1" },
    { d: "M9 22h6", fill: "none", stroke: "#06B6D4" },
    { d: "M12 6v8M9 10h6", fill: "none", stroke: "#06B6D4" },
  ],
  weekly: [
    { d: "M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", fill: "none", stroke: "#6366F1" },
    { d: "M2 8h20", fill: "none", stroke: "#06B6D4" },
    { d: "M8 4v4M16 4v4", fill: "none", stroke: "#6366F1" },
    { d: "M7 12h2M11 12h2M15 12h2M7 16h2M11 16h2", fill: "none", stroke: "#06B6D4" },
  ],
  study: [
    { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3z", fill: "none", stroke: "#6366F1" },
    { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z", fill: "none", stroke: "#06B6D4" },
  ],
  bug: [
    { d: "M12 2a4 4 0 0 0-4 4v2h8V6a4 4 0 0 0-4-4z", fill: "none", stroke: "#6366F1" },
    { d: "M8 8a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8H8z", fill: "none", stroke: "#6366F1" },
    { d: "M12 8v8M4 10H2M4 14H2M22 10h-2M22 14h-2", fill: "none", stroke: "#06B6D4" },
    { d: "M8 2l2 4M16 2l-2 4", fill: "none", stroke: "#06B6D4" },
  ],
  decision: [
    { d: "M12 3v18", fill: "none", stroke: "#6366F1" },
    { d: "M3 12h18", fill: "none", stroke: "#6366F1" },
    { d: "M7 7l2 2M17 7l-2 2", fill: "none", stroke: "#06B6D4" },
    { d: "M8 16l2-2 2 2 2-2 2 2", fill: "none", stroke: "#06B6D4" },
  ],
  reading: [
    { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20", fill: "none", stroke: "#6366F1" },
    { d: "M4 4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v13H6.5A2.5 2.5 0 0 0 4 19.5V4z", fill: "none", stroke: "#6366F1" },
    { d: "M8 7h6M8 11h4", fill: "none", stroke: "#06B6D4" },
  ],

  // Module illustrations — used in NavigationRail
  notes: [
    { d: "M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M16 3v3h3", fill: "none", stroke: "#06B6D4" },
    { d: "M8 11h8M8 15h8M8 19h5", fill: "none", stroke: "#FFFFFF" },
  ],
  tasks: [
    { d: "M4 4h16v16H4z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M8 12l3 3 6-6", fill: "none", stroke: "#FFFFFF" },
  ],
  calendar: [
    { d: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M3 10h18", fill: "none", stroke: "#06B6D4" },
    { d: "M8 2v4M16 2v4", fill: "none", stroke: "#06B6D4" },
    { d: "M8 14h2v2H8zM14 14h2v2h-2z", fill: "#FFFFFF", stroke: "#FFFFFF" },
  ],
  timer: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M12 6v6l4 2", fill: "none", stroke: "#FFFFFF" },
    { d: "M9 1h6", fill: "none", stroke: "#06B6D4" },
  ],
  ai: [
    { d: "M12 3l3 5 5 1-3.5 3.5L17 18l-5-2.5L7 18l.5-5.5L4 9l5-1z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M19 4l1 2M5 4L4 6M20 19l1 2", fill: "none", stroke: "#06B6D4" },
  ],
  code: [
    { d: "M3 4h18v16H3z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M8 9l-3 3 3 3M16 9l3 3-3 3", fill: "none", stroke: "#FFFFFF" },
    { d: "M14 8l-4 8", fill: "none", stroke: "#06B6D4" },
  ],
  disk: [
    { d: "M22 12c0 1.66-4.48 3-10 3s-10-1.34-10-3", fill: "none", stroke: "#06B6D4" },
    { d: "M2 5c0 1.66 4.48 3 10 3s10-1.34 10-3", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M2 5v14c0 1.66 4.48 3 10 3s10-1.34 10-3V5", fill: "none", stroke: "#6366F1" },
  ],
  kanban: [
    { d: "M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M5 8h3M5 12h3M11 8h3M17 8h2", fill: "none", stroke: "#FFFFFF" },
  ],
  whiteboard: [
    { d: "M3 4h18v13H3z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M8 17l-2 4M16 17l2 4", fill: "none", stroke: "#6366F1" },
    { d: "M7 8l3 3-2 4M14 7l3 6", fill: "none", stroke: "#FFFFFF" },
    { d: "M19 5l1 1", fill: "none", stroke: "#06B6D4" },
  ],
  voice: [
    { d: "M12 2a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8", fill: "none", stroke: "#06B6D4" },
  ],
  vault: [
    { d: "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", fill: "none", stroke: "#FFFFFF" },
    { d: "M12 14v3", fill: "none", stroke: "#06B6D4" },
    { d: "M9 6h6", fill: "none", stroke: "#06B6D4" },
  ],
  saved: [
    { d: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M9 8h6M9 12h4", fill: "none", stroke: "#FFFFFF" },
  ],
  status: [
    { d: "M3 12l4-4 3 3 5-5 6 6", fill: "none", stroke: "#6366F1" },
    { d: "M3 20h18", fill: "none", stroke: "#06B6D4" },
    { d: "M5 16h2v4H5zM10 14h2v6h-2zM15 11h2v9h-2z", fill: "url(#delay-grad)", stroke: "#6366F1" },
  ],
  flows: [
    { d: "M5 5h6v6H5zM13 13h6v6h-6z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M11 8h2v8M13 16h-2", fill: "none", stroke: "#06B6D4" },
    { d: "M8 8v3M16 13v3", fill: "none", stroke: "#FFFFFF" },
  ],
  settings: [
    { d: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", fill: "url(#delay-grad)", stroke: "#6366F1" },
    { d: "M19 12a7 7 0 0 0-.16-1.5l1.6-1.25-2-3.46-1.92.77a7 7 0 0 0-2.58-1.5L13.5 3h-4l-.44 2.06a7 7 0 0 0-2.58 1.5l-1.92-.77-2 3.46 1.6 1.25A7 7 0 0 0 4 12c0 .51.06 1.01.16 1.5l-1.6 1.25 2 3.46 1.92-.77a7 7 0 0 0 2.58 1.5L9.5 21h4l.44-2.06a7 7 0 0 0 2.58-1.5l1.92.77 2-3.46-1.6-1.25c.1-.49.16-.99.16-1.5z", fill: "none", stroke: "#06B6D4" },
  ],
};

export function DelayIcon({ name, size = 18, className = "" }: DelayIconProps) {
  const paths = PATHS[name];
  if (!paths) {
    // Fallback: a simple circle with D
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" stroke="#6366F1" />
        <text x="12" y="16" textAnchor="middle" fill="#06B6D4" fontSize="12" fontWeight="bold">D</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="delay-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} stroke={p.stroke || "#6366F1"} />
      ))}
    </svg>
  );
}
