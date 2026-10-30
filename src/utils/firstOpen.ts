import AsyncStorage from '@react-native-async-storage/async-storage';

// Fecha en que se abrió Rinde por primera vez. Sirve para que quienes la usaban
// antes de que existiera un plan de pago conserven gratis lo que ya tenían.
const FIRST_OPEN_KEY = '@rendimientos/first_open_at';

/** Guarda la fecha de la primera apertura; si ya existe, no la toca. */
export const recordFirstOpen = async (): Promise<void> => {
  const saved = await AsyncStorage.getItem(FIRST_OPEN_KEY);
  if (!saved) {
    await AsyncStorage.setItem(FIRST_OPEN_KEY, new Date().toISOString());
  }
};

export const getFirstOpenDate = async (): Promise<Date | null> => {
  const value = await AsyncStorage.getItem(FIRST_OPEN_KEY);
  return value ? new Date(value) : null;
};

/**
 * Al restaurar un respaldo se queda la fecha más antigua, así cambiar de celular
 * no hace perder la antigüedad.
 */
export const keepEarliestFirstOpen = async (candidate: string | undefined): Promise<void> => {
  if (!candidate || Number.isNaN(Date.parse(candidate))) return;
  const current = await getFirstOpenDate();
  if (!current || new Date(candidate) < current) {
    await AsyncStorage.setItem(FIRST_OPEN_KEY, new Date(candidate).toISOString());
  }
};
