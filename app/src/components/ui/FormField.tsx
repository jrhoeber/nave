import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: string;
  /** Icon component — defaults to Ionicons. Pass a different icon element to override. */
  iconElement?: React.ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  multiline?: boolean;
  inputStyle?: TextInputProps['style'];
  testID?: string;
}

export function FormField({
  label,
  icon,
  iconElement,
  value,
  onChangeText,
  maxLength,
  multiline,
  inputStyle,
  testID,
  ...rest
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.icon}>
          {iconElement ?? <Icon name={icon} size={13} color={Colors.accent} />}
        </View>
        <TextInput
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
          value={value}
          onChangeText={(t) => onChangeText(t.slice(0, maxLength))}
          placeholderTextColor={Colors.textLight}
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          testID={testID}
          {...rest}
        />
      </View>
      <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing[1],
  },
  label: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 0,
    marginLeft: 26 + Spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
    marginTop: 5,
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    paddingVertical: Spacing[2],
    paddingHorizontal: 0,
  },
  multilineInput: {
    minHeight: 60,
    fontWeight: Typography.regular,
    lineHeight: Typography.base * 1.5,
  },
  charCount: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing[1],
  },
});
