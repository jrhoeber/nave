import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export function Input({ label, error, hint, leftIcon, rightIcon, onRightIconPress, isPassword, style, testID, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const effectiveRightIcon = isPassword
    ? showPassword ? 'eye-off-outline' : 'eye-outline'
    : rightIcon;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, isFocused && styles.focused, !!error && styles.errored]}>
        {leftIcon && (
          <Icon name={leftIcon} size={18} color={isFocused ? Colors.primary : Colors.textSecondary} style={styles.leftIcon} />
        )}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, style]}
          placeholderTextColor={Colors.textLight}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={testID}
          {...props}
        />
        {effectiveRightIcon && (
          <TouchableOpacity
            onPress={isPassword ? () => setShowPassword((v) => !v) : onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={effectiveRightIcon} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing[4] },
  label: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginBottom: Spacing[1] },
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, minHeight: 48,
  },
  focused: { borderColor: Colors.primary },
  errored: { borderColor: Colors.error },
  leftIcon: { marginLeft: Spacing[3] },
  input: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingHorizontal: Spacing[3], paddingVertical: Spacing[3] },
  inputWithLeft: { paddingLeft: Spacing[2] },
  rightIcon: { padding: Spacing[3] },
  error: { fontSize: Typography.xs, color: Colors.error, marginTop: Spacing[1] },
  hint: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: Spacing[1] },
});
