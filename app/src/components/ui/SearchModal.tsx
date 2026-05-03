import React, { useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Typography } from '../../theme';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  sectionHeader: string;
  heroText: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (text: string) => void;
  /** Content rendered between hero text and search bar (e.g. a CTA row) */
  aboveSearch?: React.ReactNode;
  children: React.ReactNode;
}

export function SearchModal({
  visible,
  onClose,
  sectionHeader,
  heroText,
  searchPlaceholder,
  query,
  onQueryChange,
  aboveSearch,
  children,
}: SearchModalProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Dragger */}
        <View style={styles.draggerRow}>
          <View style={styles.dragger} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View />
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Done</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>{sectionHeader}</Text>
        <Text style={styles.heroText}>{heroText}</Text>

        {aboveSearch}

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={onQueryChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => onQueryChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {children}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  draggerRow: {
    alignItems: 'center',
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },
  dragger: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing[5],
    paddingRight: Spacing[7],
    paddingTop: Spacing[1],
    paddingBottom: Spacing[1],
  },
  cancelText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: '#4b5563',
    paddingRight: 0,
  },

  sectionHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
  },
  heroText: {
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 28,
    color: '#000000',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
    height: 24,
  },
});
