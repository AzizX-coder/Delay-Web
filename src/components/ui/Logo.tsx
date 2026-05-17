import logoUrl from "@/assets/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Delay"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-xl object-contain ${className}`}
      draggable={false}
      onError={(e) => {
        // Ultimate fallback to ensure app never blacks out on render
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
