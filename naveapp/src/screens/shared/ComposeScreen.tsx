import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { ComposeRouteProp } from '../../types/navigation';
import type { PostType } from '../../types';

const POST_TYPES: { type: PostType; label: string; icon: string; color: string }[] = [
  { type: 'general',        label: 'General',        icon: '💬', color: Colors.textSecondary },
  { type: 'prayer_request', label: 'Prayer Request', icon: '🙏', color: '#7c3aed' },
  { type: 'testimony',      label: 'Testimony',      icon: '⭐', color: Colors.accentDark },
  { type: 'scripture',      label: 'Scripture',      icon: '📖', color: Colors.success },
  { type: 'event',          label: 'Event',          icon: '📅', color: Colors.info },
];

const PLACEHOLDER: Record<PostType, string> = {
  general:        "Share what's on your heart...",
  prayer_request: 'Share your prayer intention with the community...',
  testimony:      'Share how God has been working in your life...',
  scripture:      'Share a scripture passage and your reflection...',
  event:          'Describe your upcoming event or gathering...',
};

export function ComposeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ComposeRouteProp>();
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>((route.params?.postType as PostType) ?? 'general');

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>New Post</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={!content.trim()}
          style={[styles.postBtn, content.trim() && styles.postBtnActive]}>
          <Text style={[styles.postBtnText, content.trim() && styles.postBtnTextActive]}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.authorRow}>
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={44} />
          <View>
            <Text style={styles.authorName}>{user?.displayName}</Text>
            <Text style={styles.authorParish}>{user?.parish ?? 'Catholic'}</Text>
          </View>
        </View>
        <TextInput value={content} onChangeText={setContent} placeholder={PLACEHOLDER[postType]}
          placeholderTextColor={Colors.textLight} multiline style={styles.input} autoFocus maxLength={1000} />
        <Text style={styles.charCount}>{content.length}/1000</Text>
      </ScrollView>

      <View style={[styles.typePicker, { paddingBottom: insets.bottom + Spacing[2] }]}>
        <Text style={styles.typePickerLabel}>Post type:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {POST_TYPES.map(({ type, label, icon, color }) => (
            <TouchableOpacity key={type} onPress={() => setPostType(type)}
              style={[styles.typeChip, postType === type && { backgroundColor: color + '20', borderColor: color }]}>
              <Text style={styles.typeChipIcon}>{icon}</Text>
              <Text style={[styles.typeChipLabel, postType === type && { color }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancelText: { fontSize: Typography.base, color: Colors.textSecondary, width: 60 },
  toolbarTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  postBtn: { backgroundColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing[4], paddingVertical: Spacing[1] + 2 },
  postBtnActive: { backgroundColor: Colors.primary },
  postBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textLight },
  postBtnTextActive: { color: Colors.textInverse },
  scroll: { padding: Spacing[4], flexGrow: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[4] },
  authorName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  authorParish: { fontSize: Typography.xs, color: Colors.textSecondary },
  input: { fontSize: Typography.md, color: Colors.textPrimary, lineHeight: Typography.md * Typography.relaxed, minHeight: 180, textAlignVertical: 'top' },
  charCount: { fontSize: Typography.xs, color: Colors.textLight, alignSelf: 'flex-end', marginTop: Spacing[3] },
  typePicker: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing[3], paddingHorizontal: Spacing[4] },
  typePickerLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: Spacing[2], fontWeight: Typography.medium },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, marginRight: Spacing[2], marginBottom: Spacing[2] },
  typeChipIcon: { fontSize: 14 },
  typeChipLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
});
