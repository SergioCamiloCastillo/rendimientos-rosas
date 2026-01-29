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
  const totalHoursRaw = record.totalHours || 0;
  const totalHours = Math.round(totalHoursRaw * 10) / 10; // Redondear a 1 decimal
  const hasHours = totalHours > 0;
  
  // Para registros con horas: meta = expectedPerformance * totalHours
  // Para registros antiguos sin horas: usar expectedPerformance directamente
  const expectedTotal = hasHours 
    ? Math.round(record.expectedPerformance * totalHours)
    : record.expectedPerformance;
  
  const percentage = expectedTotal > 0 
    ? Math.round((record.achievedPerformance / expectedTotal) * 100)
    : 0;

  // Calcular duración de un turno en horas
  const calculateShiftHours = (startTime: string, endTime: string): number => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return (endMinutes - startMinutes) / 60;
  };

  // Convertir hora 24h a formato 12h AM/PM
  const formatTimeToAMPM = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Usar porcentaje calculado para determinar si cumplió la meta
  const metGoal = percentage >= 100;

  return (
    <TouchableOpacity
      style={[styles.card, !metGoal && styles.cardNotMet]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <Text style={styles.workerName}>
            {record.workerCode ? `${record.workerCode} - ` : ''}{record.workerName}
          </Text>
          <Text style={styles.activityName}>{record.activityName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            metGoal ? styles.successBadge : styles.dangerBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              metGoal ? styles.successText : styles.dangerText,
            ]}
          >
            {percentage}%
          </Text>
        </View>
      </View>

      {hasHours && record.shifts && record.shifts.length > 0 && (
        <View style={styles.shiftsContainer}>
          {record.shifts.map((shift, index) => {
            const shiftHours = calculateShiftHours(shift.startTime, shift.endTime);
            return (
              <View key={index} style={styles.shiftRow}>
                <View style={styles.shiftTimeInfo}>
                  <Text style={styles.shiftTime}>
                    {formatTimeToAMPM(shift.startTime)} - {formatTimeToAMPM(shift.endTime)}
                  </Text>
                  <Text style={styles.shiftHours}>({shiftHours.toFixed(1)}h)</Text>
                </View>
                <Text style={styles.shiftPerformance}>
                  {shift.achievedPerformance} {record.activityUnit}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>
            {record.achievedPerformance} {record.activityUnit}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Meta</Text>
          <Text style={styles.statValue}>
            {hasHours ? expectedTotal.toFixed(0) : record.expectedPerformance} {record.activityUnit}
          </Text>
        </View>
        {hasHours && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Horas</Text>
            <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
          </View>
        )}
      </View>

      {record.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notes} numberOfLines={2}>
            {record.notes}
          </Text>
        </View>
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftHeader: {
    flex: 1,
    marginRight: 12,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  activityName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: colors.successLight,
  },
  dangerBadge: {
    backgroundColor: colors.dangerLight,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  successText: {
    color: colors.success,
  },
  dangerText: {
    color: colors.danger,
  },
  shiftsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  shiftRow: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  shiftHours: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    opacity: 0.7,
  },
  shiftPerformance: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
