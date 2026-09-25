import { View, Text, TouchableOpacity } from 'react-native';
import {
  startOfMonth, endOfMonth, startOfWeek, addDays, format,
  isSameDay, isSameMonth, parseISO,
} from 'date-fns';
import { useColors } from '@lib/colors';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type Props = {
  month: Date;
  selectedDate: Date;
  today: Date;
  dueDates: Set<string>;
  onSelectDate: (date: Date) => void;
};

export function MonthCalendar({ month, selectedDate, today, dueDates, onSelectDate }: Props) {
  const C = useColors();
  const monthStart = startOfMonth(month);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((lbl) => (
          <View key={lbl} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: C.textMuted }}>{lbl}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {cells.slice(row * 7, row * 7 + 7).map((day) => {
            const dayStr      = format(day, 'yyyy-MM-dd');
            const isSelected  = isSameDay(day, selectedDate);
            const isToday     = isSameDay(day, today);
            const isThisMonth = isSameMonth(day, month);
            const hasDue      = dueDates.has(dayStr);

            return (
              <TouchableOpacity
                key={dayStr}
                onPress={() => onSelectDate(day)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? C.primary : isToday ? C.primaryBg : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: isToday || isSelected ? '700' : '400',
                    color: isSelected ? '#fff' : isToday ? C.primary : isThisMonth ? C.text : C.textDisabled,
                  }}>
                    {format(day, 'd')}
                  </Text>
                </View>
                {hasDue && (
                  <View style={{
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: isSelected ? C.primaryLight : C.primary,
                    marginTop: 1,
                  }} />
                )}
                {!hasDue && <View style={{ width: 4, height: 4, marginTop: 1 }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
