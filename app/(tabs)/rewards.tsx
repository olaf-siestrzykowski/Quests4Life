import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Screen } from '@components/Screen';
import * as Haptics from '@lib/haptics';
import { useRewardsStore, usePointsStore, useSettingsStore } from '@store/index';
import type { RewardSort } from '@store/settingsStore';
import { useColors } from '@lib/colors';
import type { Reward, PointEntry } from '@db/schema';

type Tab = 'shop' | 'history';

const SORT_OPTIONS: { value: RewardSort; label: string }[] = [
  { value: 'affordable', label: 'Affordable' },
  { value: 'cheapest',   label: 'Cheapest' },
  { value: 'priciest',   label: 'Priciest' },
  { value: 'newest',     label: 'Newest' },
];

function sortRewards(list: Reward[], sort: RewardSort, balance: number): Reward[] {
  const sorted = [...list];
  switch (sort) {
    case 'cheapest': return sorted.sort((a, b) => a.pointCost - b.pointCost);
    case 'priciest': return sorted.sort((a, b) => b.pointCost - a.pointCost);
    case 'newest':   return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'affordable':
      // Affordable first (cheapest first within), then locked by how close they are
      return sorted.sort((a, b) => {
        const aOk = balance >= a.pointCost;
        const bOk = balance >= b.pointCost;
        if (aOk !== bOk) return aOk ? -1 : 1;
        return a.pointCost - b.pointCost;
      });
  }
}

/** Ledger timestamps are SQLite UTC ('YYYY-MM-DD HH:MM:SS'), sometimes ISO. */
function parseLedgerDate(s: string): Date {
  if (s.includes('T')) return new Date(s);
  return new Date(s.replace(' ', 'T') + 'Z');
}

export default function RewardsScreen() {
  const C = useColors();

  const rewards         = useRewardsStore((s) => s.rewards);
  const archivedRewards = useRewardsStore((s) => s.archivedRewards);
  const redeemReward    = useRewardsStore((s) => s.redeemReward);
  const archiveReward   = useRewardsStore((s) => s.archiveReward);
  const balance         = usePointsStore((s) => s.balance);
  const history         = usePointsStore((s) => s.history);
  const addPoints       = usePointsStore((s) => s.addPoints);
  const rewardSort      = useSettingsStore((s) => s.rewardSort);
  const setRewardSort   = useSettingsStore((s) => s.setRewardSort);

  const [tab, setTab] = useState<Tab>('shop');

  const sortedRewards = useMemo(
    () => sortRewards(rewards, rewardSort, balance),
    [rewards, rewardSort, balance],
  );

  // Cheapest reward the user can't afford yet — shown as the "next unlock" target
  const nextUnlock = useMemo(
    () => rewards
      .filter((r) => r.pointCost > balance)
      .sort((a, b) => a.pointCost - b.pointCost)[0],
    [rewards, balance],
  );

  const rewardNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of [...archivedRewards, ...rewards]) map.set(r.id, r.name);
    return map;
  }, [rewards, archivedRewards]);

  const redemptions = useMemo(
    () => history
      .filter((e) => e.reason === 'reward_redeem')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [history],
  );
  const totalSpent = redemptions.reduce((sum, e) => sum - e.delta, 0);

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
      { text: 'Edit', onPress: () => router.push(`/reward/${reward.id}`) },
      {
        text: 'Remove reward',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Remove reward?', `"${reward.name}" will be removed. Past redemptions stay in your history.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => archiveReward(reward.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderReward = ({ item }: { item: Reward }) => {
    const canAfford = balance >= item.pointCost;
    const progress  = Math.min(balance / item.pointCost, 1);
    return (
      <TouchableOpacity
        onPress={() => handleRedeem(item)}
        onLongPress={() => handleLongPress(item)}
        style={{
          backgroundColor: C.bgCard,
          borderRadius: 16, padding: 16, gap: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
          borderWidth: canAfford ? 1 : 0, borderColor: C.successLight,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{item.name}</Text>
            {item.description ? (
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 3 }} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.redeemedCount > 0 && (
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                Redeemed {item.redeemedCount}×
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: canAfford ? C.warning : C.textDisabled }}>
              ⭐ {item.pointCost}
            </Text>
            <View style={{
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
              backgroundColor: canAfford ? C.primary : C.border,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: canAfford ? '#fff' : C.textMuted }}>
                {canAfford ? 'Redeem' : 'Locked'}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress toward this reward */}
        <View style={{ gap: 4 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.borderLight, overflow: 'hidden' }}>
            <View style={{
              width: `${progress * 100}%`, height: '100%', borderRadius: 3,
              backgroundColor: canAfford ? C.success : C.warning,
            }} />
          </View>
          <Text style={{ fontSize: 11, color: canAfford ? C.successDark : C.textMuted, fontWeight: '600' }}>
            {canAfford ? '✓ Ready to redeem' : `${item.pointCost - balance} pts to go · ${Math.floor(progress * 100)}%`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRedemption = ({ item }: { item: PointEntry }) => {
    const name = (item.rewardId && rewardNames.get(item.rewardId)) || 'Removed reward';
    return (
      <View style={{
        backgroundColor: C.bgCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Text style={{ fontSize: 20 }}>🎁</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{name}</Text>
          {item.createdAt ? (
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {format(parseLedgerDate(item.createdAt), 'EEE, MMM d yyyy · HH:mm')}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.textSecondary }}>−⭐ {-item.delta}</Text>
      </View>
    );
  };

  return (
    <Screen edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: C.textDim }}>Rewards</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>Spend your points</Text>
          </View>
          <View style={{ backgroundColor: C.warning, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>⭐ {balance}</Text>
          </View>
        </View>

        {/* Shop / History toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: C.borderLight, borderRadius: 10, padding: 3, marginTop: 14 }}>
          {(['shop', 'history'] as const).map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                  backgroundColor: active ? C.bgCard : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? C.text : C.textMuted }}>
                  {t === 'shop' ? 'Shop' : `History${redemptions.length ? ` (${redemptions.length})` : ''}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === 'shop' ? (
        <FlatList
          data={sortedRewards}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListHeaderComponent={rewards.length > 0 ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map((o) => {
                  const active = rewardSort === o.value;
                  return (
                    <TouchableOpacity
                      key={o.value}
                      onPress={() => setRewardSort(o.value)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1,
                        backgroundColor: active ? C.primary : C.bgCard,
                        borderColor: active ? C.primary : C.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {nextUnlock && (
                <Text style={{ fontSize: 12, color: C.textSecondary }}>
                  Next unlock: <Text style={{ fontWeight: '700', color: C.text }}>{nextUnlock.name}</Text>
                  {' '}in {nextUnlock.pointCost - balance} pts
                </Text>
              )}
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 64 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
              <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '600' }}>No rewards yet</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                Tap + to add something to work towards
              </Text>
            </View>
          }
          renderItem={renderReward}
        />
      ) : (
        <FlatList
          data={redemptions}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 100 }}
          ListHeaderComponent={redemptions.length > 0 ? (
            <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
              {redemptions.length} redeemed · ⭐ {totalSpent} spent
            </Text>
          ) : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 64 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
              <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '600' }}>No redemptions yet</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                Rewards you redeem will show up here
              </Text>
            </View>
          }
          renderItem={renderRedemption}
        />
      )}

      {tab === 'shop' && (
        <TouchableOpacity
          onPress={() => router.push('/new-reward')}
          style={{
            position: 'absolute', bottom: 32, right: 24,
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: C.warning,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: C.warning, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
        </TouchableOpacity>
      )}
    </Screen>
  );
}
