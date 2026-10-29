import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { HostInstance } from 'react-native';
import { colors, fonts } from '../theme';
import { TourStep } from './steps';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  steps: TourStep[];
  index: number;
  getTarget: (id: string) => HostInstance | undefined;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const HOLE_PAD = 6;
const GAP = 14;
const CARET = 14;
const DIM = 'rgba(34, 30, 30, 0.72)';
const EASE_OUT = Easing.bezier(0.215, 0.61, 0.355, 1);
// En Android measureInWindow mide desde debajo de la barra de estado, pero el Modal
// (statusBarTranslucent) dibuja desde el borde superior de la pantalla
const WINDOW_OFFSET_Y = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export const TourOverlay: React.FC<TourOverlayProps> = ({
  steps,
  index,
  getTarget,
  onNext,
  onPrev,
  onSkip,
}) => {
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const [target, setTarget] = useState<Rect | null>(null);
  const [measured, setMeasured] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMeasured(false);
    const show = (rect: Rect | null) => {
      setTarget(rect);
      setMeasured(true);
      appear.setValue(0);
      Animated.timing(appear, {
        toValue: 1,
        duration: 260,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    };

    const node = step.target ? getTarget(step.target) : undefined;
    if (!node) {
      show(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      show(width > 0 && height > 0 ? { x, y: y + WINDOW_OFFSET_Y, width, height } : null);
    });
  }, [index]);

  // Si el elemento quedó fuera de la pantalla, el globo sale centrado
  const hole =
    target && size.height > 0 && target.y < size.height && target.y + target.height > 0
      ? {
          x: target.x - HOLE_PAD,
          y: target.y - HOLE_PAD,
          width: target.width + HOLE_PAD * 2,
          height: target.height + HOLE_PAD * 2 + (step.extendBottom ?? 0),
        }
      : null;

  const placeBelow = hole ? size.height - (hole.y + hole.height) > hole.y : true;
  const cardPosition = hole
    ? placeBelow
      ? { top: hole.y + hole.height + GAP }
      : { bottom: size.height - hole.y + GAP }
    : { top: size.height * 0.28 };
  const caretLeft = hole
    ? Math.min(Math.max(hole.x + hole.width / 2 - CARET / 2, 32), size.width - 32 - CARET)
    : 0;
  const caretPosition = placeBelow
    ? { top: (hole?.y ?? 0) + (hole?.height ?? 0) + GAP - CARET / 2 }
    : { top: (hole?.y ?? 0) - GAP - CARET / 2 };

  const translateY = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [placeBelow ? 8 : -8, 0],
  });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onSkip}
    >
      <View
        style={StyleSheet.absoluteFill}
        onLayout={e => setSize(e.nativeEvent.layout)}
      >
        {hole ? (
          <>
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(hole.y, 0) }]} />
            <View style={[styles.dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: hole.y, left: 0, width: Math.max(hole.x, 0), height: hole.height }]} />
            <View
              style={[
                styles.dim,
                { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height },
              ]}
            />
            <View
              pointerEvents="none"
              style={[styles.highlight, { top: hole.y, left: hole.x, width: hole.width, height: hole.height }]}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
        )}

        {measured && (
          <>
            {hole && (
              <Animated.View
                style={[styles.caret, caretPosition, { left: caretLeft, opacity: appear }]}
              />
            )}
            <Animated.View
              style={[styles.card, cardPosition, { opacity: appear, transform: [{ translateY }] }]}
            >
              <Text style={styles.progress}>
                Paso {index + 1} de {steps.length}
              </Text>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.text}>{step.text}</Text>

              <View style={styles.actions}>
                {!isLast && (
                  <TouchableOpacity onPress={onSkip} hitSlop={10}>
                    <Text style={styles.skip}>Saltar tutorial</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                {index > 0 && !isLast && (
                  <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={onPrev}>
                    <Text style={styles.buttonOutlineText}>Anterior</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onNext}>
                  <Text style={styles.buttonPrimaryText}>
                    {index === 0 ? 'Empezar' : isLast ? 'Listo' : 'Siguiente'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: DIM,
  },
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  caret: {
    position: 'absolute',
    width: CARET,
    height: CARET,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  progress: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    color: colors.text,
    fontFamily: fonts.display,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skip: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonOutlineText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
