import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Keyboard, Platform } from 'react-native';
import { colors } from '../theme';

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Seleccionar hora',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const hoursInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => {
        hoursInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Formatear para mostrar en formato 12h AM/PM
  const formatTimeDisplay = (timeStr: string): string => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${p}`;
  };

  const handlePress = () => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      const p = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      setHours(h12.toString());
      setMinutes(m.toString()); // Sin padding para editar
      setPeriod(p);
    } else {
      // Campos vacíos por defecto
      setHours('');
      setMinutes('');
      setPeriod('AM');
    }
    setShowModal(true);
  };

  const handleHoursChange = (text: string) => {
    // Solo permitir números y máximo 2 caracteres
    const num = text.replace(/[^0-9]/g, '').slice(0, 2);
    setHours(num);
  };

  const handleMinutesChange = (text: string) => {
    // Solo permitir números y máximo 2 caracteres
    const num = text.replace(/[^0-9]/g, '').slice(0, 2);
    setMinutes(num);
  };

  const handleConfirm = () => {
    // Validar que ambos campos tengan valor
    if (!hours || !minutes) {
      return;
    }
    
    let h = parseInt(hours, 10);
    let m = parseInt(minutes, 10);
    
    // Validar rangos
    if (h < 1 || h > 12) h = 12;
    if (m < 0 || m > 59) m = 0;
    
    let h24 = h;
    if (period === 'AM') {
      h24 = h === 12 ? 0 : h;
    } else {
      h24 = h === 12 ? 12 : h + 12;
    }
    
    const timeString = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(timeString);
    setShowModal(false);
  };
  
  const canConfirm = hours !== '' && minutes !== '';

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={handlePress}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? formatTimeDisplay(value) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, keyboardHeight > 0 && { marginBottom: keyboardHeight }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.modalButton}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={handleConfirm} disabled={!canConfirm}>
                <Text style={[styles.modalButton, styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeInputContainer}>
              <View style={styles.timeInputWrapper}>
                <Text style={styles.timeInputLabel}>Hora</Text>
                <TextInput
                  ref={hoursInputRef}
                  style={styles.timeInput}
                  value={hours}
                  onChangeText={handleHoursChange}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="--"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              <View style={styles.timeInputWrapper}>
                <Text style={styles.timeInputLabel}>Min</Text>
                <TextInput
                  style={styles.timeInput}
                  value={minutes}
                  onChangeText={handleMinutesChange}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="--"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.periodContainer}>
                <TouchableOpacity
                  style={[styles.periodButton, period === 'AM' && styles.periodButtonActive]}
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodButton, period === 'PM' && styles.periodButtonActive]}
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButton: {
    fontSize: 16,
    color: colors.primary,
  },
  confirmButton: {
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 12,
  },
  timeInputWrapper: {
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    width: 70,
    height: 60,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
  },
  periodContainer: {
    marginLeft: 12,
    marginTop: 20,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.white,
  },
});
