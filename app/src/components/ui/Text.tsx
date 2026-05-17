import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps as RNTextProps,
  type TextStyle,
  type TextInputProps as RNTextInputProps,
  PixelRatio,
  StyleSheet,
} from 'react-native';
import { FontScale } from '../../theme';

// Project-wide Text / TextInput wrappers.
//
// Why this exists:
//   - In RN 0.83 + React 19, `Text.defaultProps` no longer applies to function
//     components, so the only reliable way to get a project-wide
//     `maxFontSizeMultiplier` is to wrap and re-export Text everywhere.
//   - RN's `style.lineHeight` is a fixed pixel value that does NOT scale with
//     Dynamic Type. When fontSize grows (via Dynamic Type) but lineHeight
//     stays put, glyphs spill out of each line box and get clipped. We fix
//     this by rescaling lineHeight at render time to match the effective
//     scale (capped by maxFontSizeMultiplier).
//
// Always import Text / TextInput from this file, never from 'react-native'.

type AnyStyle = TextStyle | null | undefined | false | readonly AnyStyle[];

function scaleLineHeight(style: AnyStyle, cap: number | null | undefined): TextStyle | null {
  if (typeof cap !== 'number' || cap <= 0) return null;
  const flat = StyleSheet.flatten(style as TextStyle | undefined) as TextStyle | undefined;
  if (!flat || typeof flat.fontSize !== 'number' || typeof flat.lineHeight !== 'number') {
    return null;
  }
  const systemScale = PixelRatio.getFontScale();
  const effective = Math.min(systemScale, cap);
  if (effective <= 1) return null;
  return { lineHeight: flat.lineHeight * effective };
}

export const Text = React.forwardRef<RNText, RNTextProps>(function Text(
  { maxFontSizeMultiplier = FontScale.default, style, ...rest },
  ref,
) {
  const lineHeightOverride = scaleLineHeight(style as AnyStyle, maxFontSizeMultiplier);
  return (
    <RNText
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={lineHeightOverride ? [style, lineHeightOverride] : style}
      {...rest}
    />
  );
});

export const TextInput = React.forwardRef<RNTextInput, RNTextInputProps>(function TextInput(
  { maxFontSizeMultiplier = FontScale.default, style, ...rest },
  ref,
) {
  const lineHeightOverride = scaleLineHeight(style as AnyStyle, maxFontSizeMultiplier);
  return (
    <RNTextInput
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={lineHeightOverride ? [style, lineHeightOverride] : style}
      {...rest}
    />
  );
});
