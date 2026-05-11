interface NaveLogoProps {
  size?: number;
  /** Background color for the rounded-square. Set to "none" for transparent. */
  bg?: string;
  /** Mark color (arch + cross). */
  color?: string;
  className?: string;
}

/** Nave logo mark — mirrors `app/src/components/ui/NaveLogo.tsx`. */
export function NaveLogo({
  size = 40,
  bg = 'none',
  color = '#c4a95b',
  className,
}: NaveLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 680 680"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id="nave-logo-clip">
          <rect x="40" y="40" width="600" height="600" rx="120" />
        </clipPath>
      </defs>
      <g clipPath="url(#nave-logo-clip)">
        {bg !== 'none' && <rect x="40" y="40" width="600" height="600" fill={bg} />}
        <path
          d="M 127.33137,628.40472 V 306.25856 q 0,-225.502315 212.66863,-225.502315 212.66863,0 212.66863,225.502315 v 322.14616"
          fill="none"
          stroke={color}
          strokeWidth={46.9267}
          strokeLinejoin="round"
        />
        <rect x="312.62155" y="208.51222" width="50.303753" height="379.44711" fill={color} />
        <rect x="221.21671" y="312.79684" width="233.28952" height="44.483276" fill={color} />
      </g>
    </svg>
  );
}
