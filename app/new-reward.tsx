import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@components/Screen';
import { useRewardsStore } from '@store/index';
import { useColors } from '@lib/colors';

const COST_PRESETS = [50, 100, 200, 500, 1000];

export default function NewRewardScreen() {
  const C = useColors();
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

  const label = { fontSize: 11, fontWeight: '700' as const, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };
  const input = { backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.borderLight };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: C.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.textDim }}>New Reward</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={label}>Reward Name</Text>
          <TextInput
            style={input}
            placeholder="e.g. Nice dinner, Movie night, New shoes…"
            placeholderTextColor={C.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View>
          <Text style={label}>Description (optional)</Text>
          <TextInput
            style={[input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="What makes this feel special?"
            placeholderTextColor={C.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View>
          <Text style={label}>Point Cost</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {COST_PRESETS.map((pts) => {
              const active = pointCost === pts && !customCost;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => { setPointCost(pts); setCustomCost(''); }}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                    backgroundColor: active ? C.primary : C.bgCard,
                    borderColor: active ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                    ⭐ {pts}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Or set custom cost:</Text>
          <TextInput
            style={[input, { width: 120 }]}
            placeholder="e.g. 750"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            value={customCost}
            onChangeText={(t) => {
              setCustomCost(t);
              const n = parseInt(t, 10);
              if (!isNaN(n)) setPointCost(n);
            }}
          />
          {effectiveCost > 0 && (
            <Text style={{ fontSize: 14, color: C.primary, fontWeight: '600', marginTop: 10 }}>
              Total cost: ⭐ {effectiveCost}
            </Text>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
