import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  const radius = size <= 32 ? 8 : size <= 56 ? 14 : 20;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "#F5EEE1",
      }}
    >
      <Image
        src="/images/logo-mark.png"
        alt="ArthaSetu"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: "76%", height: "76%" }}
        priority
      />
    </div>
  );
}
