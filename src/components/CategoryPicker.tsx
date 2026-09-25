import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useCategoryStore } from '@store/index';
import { useColors } from '@lib/colors';

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const C = useColors();
  const categories = useCategoryStore((s) => s.categories);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => onChange(null)}
          style={{
            paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
            backgroundColor: value === null ? C.primary : C.bgCard,
            borderColor: value === null ? C.primary : C.border,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: value === null ? '#fff' : C.textSecondary }}>
            None
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const active = value === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onChange(cat.id)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                backgroundColor: active ? cat.color : C.bgCard,
                borderColor: active ? cat.color : C.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: active ? '#fff' : C.textSecondary }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
