import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

const toastConfig = {
  success: {
    backgroundColor: colors.success,
    icon: '✓',
  },
  error: {
    backgroundColor: colors.danger,
    icon: '✕',
  },
  warning: {
    backgroundColor: '#F59E0B',
    icon: '⚠',
  },
  info: {
    backgroundColor: colors.primary,
    icon: 'ℹ',
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={hideToast} activeOpacity={0.9}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
});
