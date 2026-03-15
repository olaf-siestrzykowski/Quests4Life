import React, { useRef } from 'react';
import { Animated, PanResponder, View, Text } from 'react-native';

type Props = {
  /** Swipe left (→ reveals right action) = complete */
  onSwipeLeft?: () => void;
  /** Swipe right (→ reveals left action) = archive */
  onSwipeRight?: () => void;
  leftColor?: string;
  rightColor?: string;
  leftLabel?: string;
  rightLabel?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

const THRESHOLD = 72;
const MAX_DRAG  = 120;

export function SwipeableRow({
  onSwipeLeft,
  onSwipeRight,
  leftColor  = '#22c55e',
  rightColor = '#f59e0b',
  leftLabel  = '✓',
  rightLabel = '🗃',
  children,
  disabled = false,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !disabled && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderMove: (_, g) => {
        const dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, g.dx));
        if (dx < 0 && onSwipeLeft) translateX.setValue(dx);
        else if (dx > 0 && onSwipeRight) translateX.setValue(dx);
      },

      onPanResponderRelease: (_, g) => {
        if (g.dx < -THRESHOLD && onSwipeLeft) {
          Animated.timing(translateX, {
            toValue: -MAX_DRAG * 1.5,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            onSwipeLeft();
          });
        } else if (g.dx > THRESHOLD && onSwipeRight) {
          Animated.timing(translateX, {
            toValue: MAX_DRAG * 1.5,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            onSwipeRight();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Opacity of left bg (shown when dragging right)
  const leftOpacity = translateX.interpolate({
    inputRange: [0, THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Opacity of right bg (shown when dragging left)
  const rightOpacity = translateX.interpolate({
    inputRange: [-THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      {/* Left revealed action (swipe right to reveal) */}
      {onSwipeRight && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: THRESHOLD,
            backgroundColor: leftColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            opacity: leftOpacity,
          }}
        >
          <Text style={{ fontSize: 22 }}>{rightLabel}</Text>
        </Animated.View>
      )}

      {/* Right revealed action (swipe left to reveal) */}
      {onSwipeLeft && (
        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: THRESHOLD,
            backgroundColor: rightColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            opacity: rightOpacity,
          }}
        >
          <Text style={{ fontSize: 22 }}>{leftLabel}</Text>
        </Animated.View>
      )}

      {/* Sliding card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}
