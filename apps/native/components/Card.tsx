/**
 * Card Component
 * Reusable glass morphism card component
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
}) => {
  const cardStyle: ViewStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
