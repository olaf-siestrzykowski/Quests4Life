import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@components/Screen';
import { useAchievementsStore, ACHIEVEMENT_DEFS } from '@store/achievementsStore';

export default function AchievementsScreen() {
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const unlockedKeys = new Set(unlocked.map((a) => a.key));

  return (
    <Screen edges={['top', 'bottom']} backgroundColor="#ffffff">
      {/* Nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#0ea5e9' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#0f172a', flex: 1, textAlign: 'center' }}>Achievements</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        <Text style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
          {unlocked.length} / {ACHIEVEMENT_DEFS.length} unlocked
        </Text>

        {/* Progress bar */}
        <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginBottom: 8 }}>
          <View style={{ height: 6, width: `${Math.round((unlocked.length / ACHIEVEMENT_DEFS.length) * 100)}%`, backgroundColor: '#f59e0b', borderRadius: 3 }} />
        </View>

        {ACHIEVEMENT_DEFS.map((def) => {
          const done = unlockedKeys.has(def.key);
          const unlockedEntry = unlocked.find((a) => a.key === def.key);
          return (
            <View
              key={def.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: done ? '#fff' : '#f8fafc',
                borderRadius: 16,
                padding: 16,
                borderWidth: done ? 1.5 : 1,
                borderColor: done ? '#fde68a' : '#f1f5f9',
                shadowColor: done ? '#f59e0b' : '#000',
                shadowOffset: { width: 0, height: done ? 2 : 1 },
                shadowOpacity: done ? 0.15 : 0.04,
                shadowRadius: done ? 6 : 3,
                elevation: done ? 3 : 1,
              }}
            >
              <Text style={{ fontSize: 36, opacity: done ? 1 : 0.25 }}>{def.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: done ? '#0f172a' : '#94a3b8' }}>
                  {def.label}
                </Text>
                <Text style={{ fontSize: 12, color: done ? '#64748b' : '#cbd5e1', marginTop: 2 }}>
                  {def.description}
                </Text>
                {done && unlockedEntry && (
                  <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600', marginTop: 4 }}>
                    Unlocked {unlockedEntry.unlockedAt.slice(0, 10)}
                  </Text>
                )}
              </View>
              {done && (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fef9c3', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12 }}>✓</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
