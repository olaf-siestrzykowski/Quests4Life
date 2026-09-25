import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { ScheduleRule } from '@lib/recurrence';
import { format, addDays, parseISO } from 'date-fns';
import { useColors } from '@lib/colors';

const TYPES: { key: ScheduleRule['type']; label: string }[] = [
  { key: 'once',               label: 'Once'     },
  { key: 'daily',              label: 'Daily'    },
  { key: 'weekly',             label: 'Weekly'   },
  { key: 'weekly_count',       label: 'N×/week'  },
  { key: 'monthly',            label: 'Monthly'  },
  { key: 'monthly_nth_weekday', label: 'Nth day'  },
  { key: 'custom',             label: 'Custom'   },
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_FULL   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NTH_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
];

type Props = {
  value: ScheduleRule;
  onChange: (rule: ScheduleRule) => void;
  endDate?: string | null;
  onEndDateChange?: (date: string | null) => void;
};

export function ScheduleRulePicker({ value, onChange, endDate, onEndDateChange }: Props) {
  const C = useColors();
  const today = format(new Date(), 'yyyy-MM-dd');

  const setType = (type: ScheduleRule['type']) => {
    switch (type) {
      case 'once':               return onChange({ type: 'once',               date: today });
      case 'daily':              return onChange({ type: 'daily',              startDate: today });
      case 'weekly':             return onChange({ type: 'weekly',             daysOfWeek: [new Date().getDay()], startDate: today });
      case 'weekly_count':       return onChange({ type: 'weekly_count',       timesPerWeek: 3, startDate: today });
      case 'monthly':            return onChange({ type: 'monthly',            dayOfMonth: new Date().getDate(), startDate: today });
      case 'monthly_nth_weekday': return onChange({ type: 'monthly_nth_weekday', nth: 1, weekday: new Date().getDay(), startDate: today });
      case 'custom':             return onChange({ type: 'custom',             intervalDays: 3, startDate: today });
    }
  };

  const activeTab: object = {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    backgroundColor: C.primary, borderColor: C.primary,
  };
  const inactiveTab: object = {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    backgroundColor: C.bgCard, borderColor: C.border,
  };
  const textInput: object = {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    width: 56, textAlign: 'center', fontSize: 15,
    color: C.text, backgroundColor: C.bgInput,
  };
  const navBtn: object = {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center',
  };
  const smallNavBtn: object = {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center',
  };

  return (
    <View>
      {/* Type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TYPES.map((t) => {
            const active = value.type === t.key;
            return (
              <TouchableOpacity key={t.key} onPress={() => setType(t.key)} style={active ? activeTab : inactiveTab}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: active ? '#fff' : C.textSecondary }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Once */}
      {value.type === 'once' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => onChange({ type: 'once', date: format(addDays(parseISO(value.date), -1), 'yyyy-MM-dd') })}
            style={navBtn}
          >
            <Text style={{ fontSize: 18, color: C.textSecondary }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>
            {format(parseISO(value.date), 'EEE, MMM d')}
          </Text>
          <TouchableOpacity
            onPress={() => onChange({ type: 'once', date: format(addDays(parseISO(value.date), 1), 'yyyy-MM-dd') })}
            style={navBtn}
          >
            <Text style={{ fontSize: 18, color: C.textSecondary }}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daily */}
      {value.type === 'daily' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 13, color: C.textMuted }}>Every day.</Text>
          <TouchableOpacity
            onPress={() => onChange({ type: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], startDate: today })}
            style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgPage }}
          >
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Weekdays only →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weekly */}
      {value.type === 'weekly' && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
                  width: 36, height: 36, borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                  backgroundColor: active ? C.primary : C.bgCard,
                  borderColor: active ? C.primary : C.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Weekly count */}
      {value.type === 'weekly_count' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>Times per week:</Text>
          <TouchableOpacity
            onPress={() => onChange({ ...value, timesPerWeek: Math.max(1, value.timesPerWeek - 1) })}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: C.textSecondary }}>−</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, minWidth: 28, textAlign: 'center' }}>
            {value.timesPerWeek}
          </Text>
          <TouchableOpacity
            onPress={() => onChange({ ...value, timesPerWeek: Math.min(7, value.timesPerWeek + 1) })}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: C.textSecondary }}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Monthly — day of month */}
      {value.type === 'monthly' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>Day of month:</Text>
          <TextInput
            style={textInput}
            keyboardType="number-pad"
            value={String(value.dayOfMonth)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!isNaN(n) && n >= 1 && n <= 31) onChange({ ...value, dayOfMonth: n });
            }}
          />
        </View>
      )}

      {/* Monthly Nth weekday */}
      {value.type === 'monthly_nth_weekday' && (
        <View style={{ gap: 10 }}>
          {/* Nth selector */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {NTH_OPTIONS.map(({ value: n, label }) => {
              const active = value.nth === n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => onChange({ ...value, nth: n })}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                    backgroundColor: active ? C.primary : C.bgCard,
                    borderColor: active ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Weekday selector */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {DAY_FULL.map((day, i) => {
              const active = value.weekday === i;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => onChange({ ...value, weekday: i })}
                  style={{
                    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                    backgroundColor: active ? C.primary : C.bgCard,
                    borderColor: active ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Custom */}
      {value.type === 'custom' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>Every</Text>
          <TextInput
            style={textInput}
            keyboardType="number-pad"
            value={String(value.intervalDays)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!isNaN(n) && n >= 1) onChange({ ...value, intervalDays: n });
            }}
          />
          <Text style={{ fontSize: 14, color: C.textSecondary }}>days</Text>
        </View>
      )}

      {/* Start date navigator — all recurring rules except 'once' */}
      {value.type !== 'once' && 'startDate' in value && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: C.textMuted, width: 60 }}>Starts:</Text>
          <TouchableOpacity
            onPress={() => onChange({ ...value, startDate: format(addDays(parseISO(value.startDate), -1), 'yyyy-MM-dd') } as typeof value)}
            style={smallNavBtn}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '500', color: C.text, minWidth: 100, textAlign: 'center' }}>
            {format(parseISO(value.startDate), 'EEE, MMM d')}
          </Text>
          <TouchableOpacity
            onPress={() => onChange({ ...value, startDate: format(addDays(parseISO(value.startDate), 1), 'yyyy-MM-dd') } as typeof value)}
            style={smallNavBtn}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary }}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* End date (P4-C) */}
      {onEndDateChange && value.type !== 'once' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: C.textMuted, width: 60 }}>Ends:</Text>
          {endDate ? (
            <>
              <TouchableOpacity
                onPress={() => onEndDateChange(format(addDays(parseISO(endDate), -1), 'yyyy-MM-dd'))}
                style={smallNavBtn}
              >
                <Text style={{ fontSize: 16, color: C.textSecondary }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.text, minWidth: 100, textAlign: 'center' }}>
                {format(parseISO(endDate), 'EEE, MMM d')}
              </Text>
              <TouchableOpacity
                onPress={() => onEndDateChange(format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd'))}
                style={smallNavBtn}
              >
                <Text style={{ fontSize: 16, color: C.textSecondary }}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onEndDateChange(null)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 18, color: C.textDisabled }}>×</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                onEndDateChange(format(d, 'yyyy-MM-dd'));
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgPage }}
            >
              <Text style={{ fontSize: 12, color: C.textSecondary }}>Set end date</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
