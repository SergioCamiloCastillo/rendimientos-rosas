import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

// Carga el módulo de forma segura para detectar si está disponible
let SpeechModule: any = null;
let useSpeechEvent: any = null;
let moduleLoadError = '';

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
  if (!SpeechModule) moduleLoadError = 'ExpoSpeechRecognitionModule es undefined';
} catch (e: any) {
  moduleLoadError = e?.message || 'Error al importar expo-speech-recognition';
}

// Hook seguro que no rompe si el módulo no está disponible
function useSafeEvent(event: string, handler: (e: any) => void) {
  if (useSpeechEvent) {
    useSpeechEvent(event, handler);
  }
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  isProcessing = false,
  disabled = false,
}) => {
  const [isListening, setIsListening] = React.useState(false);
  const [partialText, setPartialText] = React.useState('');
  const [statusMsg, setStatusMsg] = React.useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useSafeEvent('start', () => {
    console.log('[VoiceButton] evento: start');
    setIsListening(true);
    setStatusMsg('Escuchando...');
  });

  useSafeEvent('end', () => {
    console.log('[VoiceButton] evento: end');
    setIsListening(false);
    setPartialText('');
    setStatusMsg('');
  });

  useSafeEvent('result', (event: any) => {
    console.log('[VoiceButton] evento: result', JSON.stringify(event));
    const text = event.results[0]?.transcript || '';
    if (event.isFinal) {
      onTranscript(text);
      setPartialText('');
    } else {
      setPartialText(text);
    }
  });

  useSafeEvent('error', (event: any) => {
    console.log('[VoiceButton] evento: error', JSON.stringify(event));
    setIsListening(false);
    setPartialText('');
    setStatusMsg(`Error: ${event?.error || 'desconocido'}`);
  });

  useEffect(() => {
    if (isListening) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [isListening]);

  const handlePress = async () => {
    console.log('[VoiceButton] handlePress - moduleLoadError:', moduleLoadError);
    console.log('[VoiceButton] SpeechModule:', SpeechModule);

    if (moduleLoadError || !SpeechModule) {
      Alert.alert(
        'Módulo no disponible',
        `El reconocimiento de voz nativo no está disponible en este build.\n\nDetalle: ${moduleLoadError || 'módulo no cargado'}\n\nAsegúrate de compilar con: expo run:android`,
      );
      return;
    }

    if (isListening) {
      console.log('[VoiceButton] Deteniendo...');
      try { SpeechModule.stop(); } catch (e) { console.log('[VoiceButton] error al detener:', e); }
      return;
    }

    try {
      console.log('[VoiceButton] Pidiendo permisos...');
      setStatusMsg('Pidiendo permisos...');

      const permResult = await SpeechModule.requestPermissionsAsync();
      console.log('[VoiceButton] permisos:', JSON.stringify(permResult));

      if (!permResult.granted) {
        Alert.alert('Permiso denegado', 'Se necesita permiso de micrófono para usar esta función.');
        setStatusMsg('Permiso denegado');
        return;
      }

      console.log('[VoiceButton] Iniciando reconocimiento...');
      setStatusMsg('Iniciando...');

      SpeechModule.start({
        lang: 'es-AR',
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      console.log('[VoiceButton] error en handlePress:', e);
      Alert.alert('Error', `No se pudo iniciar el micrófono: ${e?.message || e}`);
      setStatusMsg(`Error: ${e?.message || 'desconocido'}`);
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.processingText}>Procesando con IA...</Text>
      </View>
    );
  }

  // Si el módulo no cargó, mostrar botón con aviso
  const moduleUnavailable = !!moduleLoadError || !SpeechModule;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        style={styles.buttonWrapper}
      >
        <Animated.View
          style={[
            styles.pulse,
            isListening && styles.pulseActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <View style={[
          styles.button,
          isListening && styles.buttonActive,
          moduleUnavailable && styles.buttonUnavailable,
        ]}>
          <MaterialIcons
            name={isListening ? 'stop' : moduleUnavailable ? 'mic-off' : 'mic'}
            size={28}
            color={colors.white}
          />
        </View>
      </TouchableOpacity>

      {isListening && (
        <View style={styles.listeningRow}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText} numberOfLines={2}>
            {partialText || 'Escuchando... habla ahora'}
          </Text>
        </View>
      )}

      {!isListening && (
        <Text style={[styles.hintText, moduleUnavailable && styles.hintError]}>
          {moduleUnavailable
            ? 'Requiere build nativo (expo run:android)'
            : statusMsg || 'Toca el micrófono y dicta el turno'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
  },
  pulseActive: {
    backgroundColor: colors.primaryLight,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonActive: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  buttonUnavailable: {
    backgroundColor: colors.textSecondary,
    shadowColor: colors.textSecondary,
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  listeningText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  hintError: {
    color: colors.danger,
    fontWeight: '500',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  processingText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
