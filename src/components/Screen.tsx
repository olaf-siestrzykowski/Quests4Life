import { Platform, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

/**
 * Drop-in replacement for SafeAreaView that constrains width to a phone-sized
 * container on web/tablet while staying full-bleed on phones.
 *
 * Usage:
 *   <Screen edges={['top']}>...</Screen>
 */

const MAX_WIDTH = 430;

type Props = {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: object;
  backgroundColor?: string;
};

export function Screen({ children, edges = ['top'], style, backgroundColor = '#f8fafc' }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor, alignItems: Platform.OS === 'web' ? 'center' : undefined }} edges={edges}>
      <View
        style={[
          { flex: 1, width: '100%' },
          Platform.OS === 'web' && { maxWidth: MAX_WIDTH },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
