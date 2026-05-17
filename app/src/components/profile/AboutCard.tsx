import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { Text } from '../ui/Text';

interface AboutCardProps {
  bio: string;
}

export function AboutCard({ bio }: AboutCardProps) {
  return (
    <>
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <View style={styles.card}>
        <Svg width={20} height={16} viewBox="0 0 24 18" fill="none" style={styles.quoteGlyph}>
          <Path
            d="M3 14c0-4 2-7 5-8l1 1c-2 1-3 3-3 5h2v4H3v-2zm10 0c0-4 2-7 5-8l1 1c-2 1-3 3-3 5h2v4h-5v-2z"
            fill={Colors.accent}
            fillOpacity={0.85}
          />
        </Svg>
        <Text style={styles.bioText}>{bio}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[6],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[5],
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[6],
  },
  quoteGlyph: {
    marginRight: Spacing[2],
    marginTop: 2,
  },
  bioText: {
    flex: 1,
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: Typography.md,
    fontStyle: 'italic',
    color: '#000000',
    lineHeight: Typography.md * 1.6,
  },
});
