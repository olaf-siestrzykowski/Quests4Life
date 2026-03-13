import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@components/Screen';
import * as Haptics from '@lib/haptics';
import { useRewardsStore, usePointsStore } from '@store/index';
import type { Reward } from '@db/schema';

export default function RewardsScreen() {
  const rewards     = useRewardsStore((s) => s.rewards);
  const redeemReward = useRewardsStore((s) => s.redeemReward);
  const archiveReward = useRewardsStore((s) => s.archiveReward);
  const balance     = usePointsStore((s) => s.balance);
  const addPoints   = usePointsStore((s) => s.addPoints);

  const handleRedeem = (reward: Reward) => {
    if (balance < reward.pointCost) {
      Alert.alert(
        'Not enough points',
        `You need ${reward.pointCost - balance} more points to redeem "${reward.name}".`,
      );
      return;
    }
    Alert.alert(
      `Redeem "${reward.name}"?`,
      `This will cost ⭐ ${reward.pointCost} points. Your balance will drop to ${balance - reward.pointCost}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            await redeemReward(reward.id);
            await addPoints(-reward.pointCost, 'reward_redeem', { rewardId: reward.id });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Enjoy! 🎁', `You redeemed "${reward.name}". Well done!`);
          },
        },
      ],
    );
  };

  const handleLongPress = (reward: Reward) => {
    Alert.alert(reward.name, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove reward',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Remove reward?', `"${reward.name}" will be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => archiveReward(reward.id) },
          ]),
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a' }}>Rewards</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>Spend your points</Text>
          </View>
          <View style={{ backgroundColor: '#f59e0b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>⭐ {balance}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={rewards}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 64 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
            <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>No rewards yet</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Tap + to add something to work towards
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const canAfford = balance >= item.pointCost;
          return (
            <TouchableOpacity
              onPress={() => handleRedeem(item)}
              onLongPress={() => handleLongPress(item)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
                opacity: canAfford ? 1 : 0.75,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1e293b' }}>{item.name}</Text>
                {item.description ? (
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 3 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                {item.redeemedCount > 0 && (
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                    Redeemed {item.redeemedCount}×
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: canAfford ? '#f59e0b' : '#cbd5e1' }}>
                  ⭐ {item.pointCost}
                </Text>
                <View
                  style={{
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: canAfford ? '#0ea5e9' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: canAfford ? '#fff' : '#94a3b8' }}>
                    {canAfford ? 'Redeem' : 'Locked'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/new-reward')}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#f59e0b',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#f59e0b',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </Screen>
  );
}
