import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  backgroundColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  color = colors.primary,
  backgroundColor = colors.primaryLight,
}) => {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
