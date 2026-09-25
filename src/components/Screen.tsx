import { Platform, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useColors } from '@lib/colors';

const MAX_WIDTH = 430;

type Props = {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: object;
  backgroundColor?: string;
};

export function Screen({ children, edges = ['top'], style, backgroundColor }: Props) {
  const C = useColors();
  const bg = backgroundColor ?? C.bgPage;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg, alignItems: Platform.OS === 'web' ? 'center' : undefined }} edges={edges}>
      <View
        style={[
          { flex: 1, width: '100%', backgroundColor: bg },
          Platform.OS === 'web' && { maxWidth: MAX_WIDTH },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
