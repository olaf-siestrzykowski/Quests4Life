import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useCategoryStore } from '@store/index';

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const categories = useCategoryStore((s) => s.categories);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => onChange(null)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            backgroundColor: value === null ? '#334155' : '#ffffff',
            borderColor: value === null ? '#334155' : '#e2e8f0',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: value === null ? '#fff' : '#475569' }}>
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
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: active ? cat.color : '#ffffff',
                borderColor: active ? cat.color : '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: active ? '#fff' : '#475569' }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
