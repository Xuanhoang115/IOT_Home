import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LAYOUT } from '../../styles/neumorphicTheme';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Căn giữa và giới hạn độ rộng nội dung trên Web/Tablet để giữ bố cục cân đối,
 * đồng thời giữ 100% chiều rộng trên điện thoại.
 */
export default function ResponsiveContainer({
  children,
  maxWidth = LAYOUT.maxContentWidth,
  style,
}: ResponsiveContainerProps) {
  return <View style={[styles.container, { maxWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
});
