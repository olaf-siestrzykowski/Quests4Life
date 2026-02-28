import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRewardsStore } from '@store/index';

const COST_PRESETS = [50, 100, 200, 500, 1000];

export default function NewRewardScreen() {
  const addReward = useRewardsStore((s) => s.addReward);

  const [name, setName]           = useState('');
  const [description, setDescription] = useState('');
  const [pointCost, setPointCost] = useState(100);
  const [customCost, setCustomCost] = useState('');

  const effectiveCost = customCost ? parseInt(customCost, 10) || pointCost : pointCost;

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a reward name.');
      return;
    }
    if (effectiveCost <= 0) {
      Alert.alert('Invalid cost', 'Cost must be greater than 0.');
      return;
    }
    await addReward({
      name: name.trim(),
      description: description.trim() || null,
      pointCost: effectiveCost,
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#0ea5e9' }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#0f172a' }}>New Reward</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ fontSize: 16, color: '#0ea5e9', fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={styles.label}>Reward Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Nice dinner, Movie night, New shoes…"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="What makes this feel special?"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View>
          <Text style={styles.label}>Point Cost</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {COST_PRESETS.map((pts) => {
              const active = pointCost === pts && !customCost;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => { setPointCost(pts); setCustomCost(''); }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: active ? '#0ea5e9' : '#fff',
                    borderColor: active ? '#0ea5e9' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#475569' }}>
                    ⭐ {pts}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Or set custom cost:</Text>
          <TextInput
            style={[styles.input, { width: 120 }]}
            placeholder="e.g. 750"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={customCost}
            onChangeText={(t) => {
              setCustomCost(t);
              const n = parseInt(t, 10);
              if (!isNaN(n)) setPointCost(n);
            }}
          />
          {effectiveCost > 0 && (
            <Text style={{ fontSize: 14, color: '#0ea5e9', fontWeight: '600', marginTop: 10 }}>
              Total cost: ⭐ {effectiveCost}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
};
