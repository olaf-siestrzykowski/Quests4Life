import { View, Text, TouchableOpacity } from 'react-native';
import {
  startOfMonth, endOfMonth, startOfWeek, addDays, format,
  isSameDay, isSameMonth, parseISO,
} from 'date-fns';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type Props = {
  /** The month being displayed */
  month: Date;
  /** The currently selected date */
  selectedDate: Date;
  /** Today's date (for highlighting) */
  today: Date;
  /** Set of ISO date strings (yyyy-MM-dd) that have at least one task due */
  dueDates: Set<string>;
  onSelectDate: (date: Date) => void;
};

export function MonthCalendar({ month, selectedDate, today, dueDates, onSelectDate }: Props) {
  // Build 6-week grid starting on Monday before the 1st of the month
  const monthStart = startOfMonth(month);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
      {/* Weekday headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((lbl) => (
          <View key={lbl} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#94a3b8' }}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* 6 rows of 7 days */}
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {cells.slice(row * 7, row * 7 + 7).map((day) => {
            const dayStr     = format(day, 'yyyy-MM-dd');
            const isSelected = isSameDay(day, selectedDate);
            const isToday    = isSameDay(day, today);
            const isThisMonth = isSameMonth(day, month);
            const hasDue     = dueDates.has(dayStr);

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
                  backgroundColor: isSelected ? '#0ea5e9' : isToday ? '#e0f2fe' : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: isToday || isSelected ? '700' : '400',
                    color: isSelected ? '#fff' : isToday ? '#0ea5e9' : isThisMonth ? '#334155' : '#cbd5e1',
                  }}>
                    {format(day, 'd')}
                  </Text>
                </View>
                {/* Task-due dot */}
                {hasDue && (
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isSelected ? '#bae6fd' : '#0ea5e9',
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
