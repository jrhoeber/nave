import React from 'react';
import Svg, { Defs, ClipPath, Rect, G, Path } from 'react-native-svg';

interface NaveLogoProps {
  size?: number;
}

export function NaveLogo({ size = 80 }: NaveLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 680 680">
      <Defs>
        <ClipPath id="r">
          <Rect x="40" y="40" width="600" height="600" rx="120" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#r)">
        <Path
          d="M 127.33137,628.40472 V 306.25856 q 0,-225.502315 212.66863,-225.502315 212.66863,0 212.66863,225.502315 v 322.14616"
          fill="none"
          stroke="#c4a95b"
          strokeWidth={46.9267}
          strokeLinejoin="round"
        />
        <Rect
          x={312.62155}
          y={208.51222}
          width={50.303753}
          height={379.44711}
          fill="#c4a95b"
        />
        <Rect
          x={221.21671}
          y={312.79684}
          width={233.28952}
          height={44.483276}
          fill="#c4a95b"
        />
      </G>
    </Svg>
  );
}
