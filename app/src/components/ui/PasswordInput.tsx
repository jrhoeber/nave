import React from 'react';
import { Input } from './Input';
import type { TextInputProps } from 'react-native';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  hint?: string;
  mode: 'create' | 'signin';
}

export function PasswordInput({ mode, ...props }: PasswordInputProps) {
  return (
    <Input
      {...props}
      isPassword
      leftIcon="lock-closed-outline"
      autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
      textContentType={mode === 'create' ? 'newPassword' : 'password'}
      autoCapitalize="none"
      autoCorrect={false}
      contextMenuHidden={false}
    />
  );
}
