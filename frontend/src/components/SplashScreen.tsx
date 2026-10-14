import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, Platform, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const useNative = Platform.OS !== 'web';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.72));
  const [taglineOpacity] = useState(() => new Animated.Value(0));
  const [overlayOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.sequence([
      // Fade + scale logo in
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: useNative,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: useNative,
        }),
      ]),
      // Fade tagline in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 450,
        delay: 100,
        useNativeDriver: useNative,
      }),
      // Hold for a moment
      Animated.delay(900),
      // Fade the whole splash out
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: useNative,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [logoOpacity, logoScale, taglineOpacity, overlayOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity, pointerEvents: 'none' }]}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            alignItems: 'center',
          }}
        >
          <Image
            source={require('../../assets/images/homehalo-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          HOME SERVICES & BOOKING
        </Animated.Text>
      </View>
      {/* Subtle bottom glow */}
      <View style={styles.glowBottom} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#F3F1FD',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 260,
    height: 200,
  },
  tagline: {
    marginTop: 10,
    color: '#8157FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: '#5B3DF5',
    opacity: 0.05,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },
});
