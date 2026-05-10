import Image from "next/image";

interface ProsvetLogoProps {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export function ProsvetLogo({
  size = 44,
  showText = true,
  textClassName = "text-2xl font-extrabold tracking-tight text-slate-900",
  className = "",
}: ProsvetLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/prosvet-logo.png"
        alt="Просвет"
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      {showText ? <span className={textClassName}>Просвет</span> : null}
    </span>
  );
}
