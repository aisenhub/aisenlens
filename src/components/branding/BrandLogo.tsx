interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <svg viewBox="0 0 110 90" className={`shrink-0 ${className}`} overflow="visible" preserveAspectRatio="xMidYMid meet" role="img" aria-label="AisenLens">
      <path d="M66.57,29.62 A24,24 0 0,1 105.64,43.82 L96.77,45.39 A15,15 0 0,0 72.36,36.51 Z" fill="#b0b0b0" />
      <path d="M105.64,43.82 A24,24 0 0,1 90.21,70.56 L87.13,62.10 A15,15 0 0,0 96.77,45.39 Z" fill="#6b7280" />
      <path d="M90.21,70.56 A24,24 0 0,1 70.00,68.78 L74.50,60.99 A15,15 0 0,0 87.13,62.10 Z" fill="#3b82f6" />
      <circle cx="82" cy="48" r="24" fill="none" stroke="#4b5563" strokeWidth="1.6" />
      <circle cx="82" cy="48" r="15" fill="none" stroke="#374151" strokeWidth="1.2" />
      <line x1="96.77" y1="45.39" x2="105.64" y2="43.82" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="87.13" y1="62.10" x2="90.21" y2="70.56" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="74.50" y1="60.99" x2="70.00" y2="68.78" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="72.36" y1="36.51" x2="66.57" y2="29.62" stroke="white" strokeWidth="1" opacity="0.6" />
      <polygon points="2,86 36,4 46,4 16,86" fill="white" />
      <polygon points="46,4 56,4 76,86 64,86" fill="white" />
      <polygon points="19,56 63,56 61,48 21,48" fill="white" />
    </svg>
  );
}
