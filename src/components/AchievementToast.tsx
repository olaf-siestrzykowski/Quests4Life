import { useEffect, useRef } from 'react';
import { Animated, Text, View, TouchableOpacity } from 'react-native';
import { useAchievementsStore } from '@store/index';
import { darkColors } from '@lib/colors';

// Toast always uses dark palette — high-contrast overlay regardless of app theme
const D = darkColors;

export function AchievementToast() {
  const justUnlocked = useAchievementsStore((s) => s.justUnlocked);
  const markSeen     = useAchievementsStore((s) => s.markSeen);
  const translateY   = useRef(new Animated.Value(-100)).current;
  const opacity      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!justUnlocked) return;

    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(2800),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => markSeen());
  }, [justUnlocked?.key]);

  if (!justUnlocked) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <TouchableOpacity onPress={() => { markSeen(); }} activeOpacity={0.9}>
        <View style={{
          backgroundColor: D.bgCard,
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <Text style={{ fontSize: 32 }}>{justUnlocked.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: D.warning, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Achievement Unlocked!
            </Text>
            <Text style={{ fontSize: 15, color: D.textDim, fontWeight: '700', marginTop: 2 }}>
              {justUnlocked.label}
            </Text>
            <Text style={{ fontSize: 12, color: D.textMuted, marginTop: 1 }}>
              {justUnlocked.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
