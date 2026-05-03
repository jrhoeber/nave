import React from 'react';
import { type ViewStyle } from 'react-native';
import { Button } from './Button';

interface EmptyActionButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function EmptyActionButton({ label, onPress, style }: EmptyActionButtonProps) {
  return (
    <Button
      label={label}
      onPress={onPress}
      showArrow
      style={{ alignSelf: 'flex-start', ...style }}
    />
  );
}
