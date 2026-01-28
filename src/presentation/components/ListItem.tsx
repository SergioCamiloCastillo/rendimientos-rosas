import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  rightText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  backgroundColor?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  rightText,
  leftIcon,
  rightIcon,
  onPress,
  onLongPress,
  backgroundColor = colors.surface,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={onPress === undefined && onLongPress === undefined}
    >
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightText && <Text style={styles.rightText}>{rightText}</Text>}
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  leftIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  rightIcon: {
    marginLeft: 8,
  },
});
