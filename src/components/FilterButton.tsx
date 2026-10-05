// src/components/FilterButton.tsx
// Nút lọc [Filter ▼] nằm ngang hàng với thanh tìm kiếm (bên phải).

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterButtonProps {
  /** Callback khi người dùng bấm nút lọc */
  onPress?: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Filter rooms"
    >
      <Ionicons name="options-outline" size={19} color="#374151" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 10,
    width: 40,
    height: 40,
    marginLeft: 10,
  },
});

export default FilterButton;