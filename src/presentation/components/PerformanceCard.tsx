import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';
import { PerformanceRecordWithDetails } from '../../domain/entities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PerformanceCardProps {
  record: PerformanceRecordWithDetails;
  onPress?: () => void;
  onDelete?: () => void;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  record,
  onPress,
  onDelete,
}) => {
  // Calcular meta total basada en horas trabajadas
  const totalHours = record.totalHours || 0;
  const hasHours = totalHours > 0;
  
  // Para registros con horas: meta = expectedPerformance * totalHours
  // Para registros antiguos sin horas: usar expectedPerformance directamente
  const expectedTotal = hasHours 
    ? record.expectedPerformance * totalHours 
    : record.expectedPerformance;
  
  const percentage = expectedTotal > 0 
    ? Math.round((record.achievedPerformance / expectedTotal) * 100)
    : 0;

  // Formatear turnos para mostrar
  const shiftsText = record.shifts && record.shifts.length > 0
    ? record.shifts.map(s => `${s.startTime}-${s.endTime}`).join(', ')
    : '';

  return (
    <TouchableOpacity
      style={[styles.card, !record.metGoal && styles.cardNotMet]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={styles.date}>
            {format(new Date(record.date + 'T12:00:00'), 'dd MMM', { locale: es })}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            record.metGoal ? styles.successBadge : styles.dangerBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              record.metGoal ? styles.successText : styles.dangerText,
            ]}
          >
            {record.metGoal ? 'Cumplió' : 'No cumplió'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.workerName}>{record.workerName}</Text>
        <Text style={styles.activityName}>{record.activityName}</Text>
        {totalHours > 0 && (
          <Text style={styles.hoursText}>
            {totalHours.toFixed(1)}h trabajadas {shiftsText && `(${shiftsText})`}
          </Text>
        )}
      </View>

      <View style={styles.performanceContainer}>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Logrado</Text>
          <Text style={styles.performanceValue}>
            {record.achievedPerformance} {record.activityUnit}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>
            {hasHours ? `Meta (${totalHours.toFixed(1)}h)` : 'Meta'}
          </Text>
          <Text style={styles.performanceValue}>
            {hasHours ? expectedTotal.toFixed(0) : record.expectedPerformance} {record.activityUnit}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>%</Text>
          <Text
            style={[
              styles.percentageValue,
              percentage >= 100 ? styles.successColor : styles.dangerColor,
            ]}
          >
            {percentage}%
          </Text>
        </View>
      </View>

      {record.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {record.notes}
        </Text>
      )}

      {onDelete && (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Eliminar</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardNotMet: {
    backgroundColor: colors.dangerLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  successBadge: {
    backgroundColor: colors.successLight,
  },
  dangerBadge: {
    backgroundColor: colors.dangerLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
  },
  dangerText: {
    color: colors.danger,
  },
  content: {
    marginBottom: 12,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  activityName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  hoursText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  performanceContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  percentageValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  successColor: {
    color: colors.success,
  },
  dangerColor: {
    color: colors.danger,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  deleteButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  deleteText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
  },
});
