import { Image, StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

type BrandLogoVariant = 'horizontal' | 'icon';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  withCard?: boolean;
}

const horizontalLogoSource = require('../../../assets/fluxy-logo-horizontal.png');
const iconLogoSource = require('../../../assets/fluxy-logo-icon.png');

export function BrandLogo({
  variant = 'horizontal',
  withCard = false
}: BrandLogoProps) {
  const isHorizontal = variant === 'horizontal';

  const image = (
    <Image
      source={isHorizontal ? horizontalLogoSource : iconLogoSource}
      resizeMode="contain"
      style={isHorizontal ? styles.horizontalImage : styles.iconImage}
    />
  );

  if (!withCard) {
    return image;
  }

  return (
    <View style={isHorizontal ? styles.horizontalCard : styles.iconCard}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalCard: {
    alignSelf: 'flex-start',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.card
  },
  iconCard: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.sm,
    ...shadows.button
  },
  horizontalImage: {
    width: 172,
    height: 42
  },
  iconImage: {
    width: 38,
    height: 38
  }
});
