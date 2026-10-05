// src/components/SearchBar.tsx
// Component thanh tìm kiếm, tích hợp icon kính lúp (Search icon) bên trái.
// Nhận giá trị và onChangeText từ component cha (controlled component).

import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  /** Giá trị hiện tại của ô tìm kiếm */
  value: string;
  /** Callback khi người dùng nhập text */
  onChangeText: (text: string) => void;
  /** Placeholder hiển thị khi ô trống */
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search rooms...',
}) => {
  return (
    <View style={styles.container}>
      {/* Icon kính lúp bên trái */}
      <Ionicons name="search" size={20} color="#9CA3AF" style={styles.icon} />

      {/* Ô nhập liệu tìm kiếm */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoCorrect={false}
        returnKeyType="search"
      />

      {/* Nút xóa nhanh (chỉ hiện khi có text) */}
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  icon: {
    marginRight: 7,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    // Loại bỏ padding mặc định trên Android để căn giữa đẹp hơn
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
});

export default SearchBar;