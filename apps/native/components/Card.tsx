/**
 * Card Component — Elevated surface card
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/hooks';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outline';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const theme = useTheme();

  const cardStyle: ViewStyle = {
    borderRadius: theme.layout.card.borderRadius,
    padding: theme.layout.card.padding,
    borderWidth: 1,
  };

  switch (variant) {
    case 'elevated':
      cardStyle.backgroundColor = theme.colors.surface.elevated;
      cardStyle.borderColor = theme.colors.border.secondary;
      Object.assign(cardStyle, theme.shadows.sm);
      break;
    case 'outline':
      cardStyle.backgroundColor = 'transparent';
      cardStyle.borderColor = theme.colors.border.primary;
      break;
    default:
      cardStyle.backgroundColor = theme.colors.surface.primary;
      cardStyle.borderColor = theme.colors.border.primary;
      break;
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
