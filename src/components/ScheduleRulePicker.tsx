import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ScheduleRule } from '@lib/recurrence';
import { format, addDays, parseISO } from 'date-fns';

const TYPES: { key: ScheduleRule['type']; label: string }[] = [
  { key: 'once',    label: 'Once'    },
  { key: 'daily',   label: 'Daily'   },
  { key: 'weekly',  label: 'Weekly'  },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom',  label: 'Custom'  },
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Props = {
  value: ScheduleRule;
  onChange: (rule: ScheduleRule) => void;
};

export function ScheduleRulePicker({ value, onChange }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const setType = (type: ScheduleRule['type']) => {
    switch (type) {
      case 'once':    return onChange({ type: 'once',    date: today });
      case 'daily':   return onChange({ type: 'daily',   startDate: today });
      case 'weekly':  return onChange({ type: 'weekly',  daysOfWeek: [new Date().getDay()], startDate: today });
      case 'monthly': return onChange({ type: 'monthly', dayOfMonth: new Date().getDate(),  startDate: today });
      case 'custom':  return onChange({ type: 'custom',  intervalDays: 3, startDate: today });
    }
  };

  return (
    <View>
      {/* Type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TYPES.map((t) => {
            const active = value.type === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setType(t.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: active ? '#0ea5e9' : '#ffffff',
                  borderColor: active ? '#0ea5e9' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: active ? '#fff' : '#475569' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Once — date navigator */}
      {value.type === 'once' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => onChange({ type: 'once', date: format(addDays(parseISO(value.date), -1), 'yyyy-MM-dd') })}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: '#475569' }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#1e293b' }}>
            {format(parseISO(value.date), 'EEE, MMM d')}
          </Text>
          <TouchableOpacity
            onPress={() => onChange({ type: 'once', date: format(addDays(parseISO(value.date), 1), 'yyyy-MM-dd') })}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: '#475569' }}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daily — weekdays shortcut */}
      {value.type === 'daily' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>Every day.</Text>
          <TouchableOpacity
            onPress={() =>
              onChange({ type: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], startDate: today })
            }
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
            }}
          >
            <Text style={{ fontSize: 12, color: '#475569' }}>Weekdays only →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weekly — day-of-week buttons */}
      {value.type === 'weekly' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DAY_LABELS.map((label, i) => {
            const active = value.daysOfWeek.includes(i);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  const days = active
                    ? value.daysOfWeek.filter((d) => d !== i)
                    : [...value.daysOfWeek, i];
                  if (days.length > 0) onChange({ ...value, daysOfWeek: days });
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  backgroundColor: active ? '#0ea5e9' : '#ffffff',
                  borderColor: active ? '#0ea5e9' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : '#64748b' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Monthly — day of month */}
      {value.type === 'monthly' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 14, color: '#475569' }}>Day of month:</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
              width: 56,
              textAlign: 'center',
              fontSize: 15,
              color: '#1e293b',
            }}
            keyboardType="number-pad"
            value={String(value.dayOfMonth)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!isNaN(n) && n >= 1 && n <= 31) onChange({ ...value, dayOfMonth: n });
            }}
          />
        </View>
      )}

      {/* Custom — interval in days */}
      {value.type === 'custom' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 14, color: '#475569' }}>Every</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
              width: 56,
              textAlign: 'center',
              fontSize: 15,
              color: '#1e293b',
            }}
            keyboardType="number-pad"
            value={String(value.intervalDays)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!isNaN(n) && n >= 1) onChange({ ...value, intervalDays: n });
            }}
          />
          <Text style={{ fontSize: 14, color: '#475569' }}>days</Text>
        </View>
      )}

      {/* Start date navigator — shown for all recurring rules except 'once' */}
      {value.type !== 'once' && 'startDate' in value && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: '#94a3b8', width: 60 }}>Starts:</Text>
          <TouchableOpacity
            onPress={() => onChange({ ...value, startDate: format(addDays(parseISO(value.startDate), -1), 'yyyy-MM-dd') } as typeof value)}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, color: '#475569' }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#1e293b', minWidth: 100, textAlign: 'center' }}>
            {format(parseISO(value.startDate), 'EEE, MMM d')}
          </Text>
          <TouchableOpacity
            onPress={() => onChange({ ...value, startDate: format(addDays(parseISO(value.startDate), 1), 'yyyy-MM-dd') } as typeof value)}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, color: '#475569' }}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
