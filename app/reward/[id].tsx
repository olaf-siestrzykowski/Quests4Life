import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@components/Screen';
import { useRewardsStore } from '@store/index';
import { useColors } from '@lib/colors';

const COST_PRESETS = [50, 100, 200, 500, 1000];

export default function RewardDetailScreen() {
  const C = useColors();
  const { id }        = useLocalSearchParams<{ id: string }>();
  const rewards       = useRewardsStore((s) => s.rewards);
  const updateReward  = useRewardsStore((s) => s.updateReward);
  const archiveReward = useRewardsStore((s) => s.archiveReward);

  const reward = rewards.find((r) => r.id === id);

  const [name, setName]               = useState(reward?.name ?? '');
  const [description, setDescription] = useState(reward?.description ?? '');
  const [pointCost, setPointCost]     = useState(reward?.pointCost ?? 100);
  const [customCost, setCustomCost]   = useState(
    reward && !COST_PRESETS.includes(reward.pointCost) ? String(reward.pointCost) : '',
  );
  const [dirty, setDirty] = useState(false);

  if (!reward) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted }}>Reward not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: C.primary }}>Go back</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const effectiveCost = customCost ? parseInt(customCost, 10) || 0 : pointCost;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a reward name.');
      return;
    }
    if (effectiveCost <= 0) {
      Alert.alert('Invalid cost', 'Cost must be greater than 0.');
      return;
    }
    await updateReward(id, {
      name: name.trim(),
      description: description.trim() || null,
      pointCost: effectiveCost,
    });
    router.back();
  };

  const handleRemove = () => {
    Alert.alert(`Remove "${reward.name}"?`, 'It will disappear from the shop. Past redemptions stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => { await archiveReward(id); router.back(); },
      },
    ]);
  };

  const markDirty = (fn: () => void) => { fn(); setDirty(true); };

  const label = { fontSize: 11, fontWeight: '700' as const, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };
  const input = { backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.borderLight };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: C.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.textDim }}>Edit Reward</Text>
        <TouchableOpacity onPress={dirty ? handleSave : () => router.back()}>
          <Text style={{ fontSize: 16, color: dirty ? C.primary : C.textMuted, fontWeight: '600' }}>
            {dirty ? 'Save' : 'Done'}
          </Text>
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
            onChangeText={(t) => markDirty(() => setName(t))}
          />
        </View>

        <View>
          <Text style={label}>Description (optional)</Text>
          <TextInput
            style={[input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="What makes this feel special?"
            placeholderTextColor={C.textMuted}
            value={description}
            onChangeText={(t) => markDirty(() => setDescription(t))}
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
                  onPress={() => markDirty(() => { setPointCost(pts); setCustomCost(''); })}
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
            onChangeText={(t) => markDirty(() => setCustomCost(t.replace(/[^0-9]/g, '')))}
          />
          {effectiveCost > 0 && (
            <Text style={{ fontSize: 14, color: C.primary, fontWeight: '600', marginTop: 10 }}>
              Total cost: ⭐ {effectiveCost}
            </Text>
          )}
        </View>

        {reward.redeemedCount > 0 && (
          <Text style={{ fontSize: 13, color: C.textSecondary }}>
            Redeemed {reward.redeemedCount}× so far. Changing the cost doesn't affect past redemptions.
          </Text>
        )}

        <TouchableOpacity
          onPress={handleRemove}
          style={{ marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.dangerLight, alignItems: 'center', borderWidth: 1, borderColor: C.danger }}
        >
          <Text style={{ fontSize: 15, color: C.danger, fontWeight: '600' }}>Remove Reward</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
