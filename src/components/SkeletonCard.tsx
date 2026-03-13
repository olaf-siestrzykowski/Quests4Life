import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0' }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ height: 14, backgroundColor: '#e2e8f0', borderRadius: 7, width: '70%' }} />
        <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, width: '40%' }} />
      </View>
      <View style={{ width: 28, height: 14, backgroundColor: '#e2e8f0', borderRadius: 7 }} />
    </Animated.View>
  );
}
