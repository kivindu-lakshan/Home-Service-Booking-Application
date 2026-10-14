import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  /** Small label shown below the wordmark (e.g. "ADMIN PORTAL", "PROVIDER WORKSPACE") */
  subtitle?: string;
  /** Override text colour for dark backgrounds */
  dark?: boolean;
}

/**
 * Compact HomeHalo brand mark used in the top-left of the
 * Admin dashboard, Customer home page, and Provider dashboard.
 */
export function BrandHeader({ subtitle, dark = false }: Props) {
  return (
    <View style={styles.row}>
      <Image
        source={require('../../assets/images/homehalo-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="HomeHalo logo"
      />
      <View style={styles.text}>
        <View style={styles.wordmarkRow}>
          <Text style={[styles.home, dark && styles.homeDark]}>Home</Text>
          <Text style={styles.halo}>Halo</Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 36,
    height: 36,
  },
  text: {
    gap: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  home: {
    fontSize: 17,
    fontWeight: '800',
    color: '#242E49',
    letterSpacing: -0.5,
  },
  homeDark: {
    color: '#FFFFFF',
  },
  halo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#5B3DF5',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#8A91A5',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  subtitleDark: {
    color: '#B0A8CC',
  },
});
