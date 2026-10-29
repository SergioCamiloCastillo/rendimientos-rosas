import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { HostInstance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_STEPS } from './steps';
import { TourOverlay } from './TourOverlay';

const TOUR_DONE_KEY = '@rendimientos/tour_done';
// App.tsx oculta el splash a los 2 s; el tutorial arranca justo después
const FIRST_RUN_DELAY = 2600;

interface TourContextValue {
  startTour: () => void;
  registerTarget: (id: string, node: HostInstance | null) => void;
  // Lo que debe pasar antes de medir (p. ej. subir el scroll de Inicio)
  setBeforeStart: (fn: (() => void) | null) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const targets = useRef(new Map<string, HostInstance>());
  const beforeStart = useRef<(() => void) | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  const registerTarget = useCallback((id: string, node: HostInstance | null) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);

  const setBeforeStart = useCallback((fn: (() => void) | null) => {
    beforeStart.current = fn;
  }, []);

  const startTour = useCallback(() => {
    beforeStart.current?.();
    // Un momento para que el scroll y la navegación terminen antes de medir
    setTimeout(() => setIndex(0), 150);
  }, []);

  const finish = useCallback(() => {
    setIndex(null);
    AsyncStorage.setItem(TOUR_DONE_KEY, 'true').catch(() => {});
  }, []);

  // Primera vez que se abre la app
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(TOUR_DONE_KEY)
      .then(done => {
        if (!done) timer = setTimeout(startTour, FIRST_RUN_DELAY);
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, [startTour]);

  const value = useMemo(
    () => ({ startTour, registerTarget, setBeforeStart }),
    [startTour, registerTarget, setBeforeStart]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {index !== null && (
        <TourOverlay
          steps={TOUR_STEPS}
          index={index}
          getTarget={id => targets.current.get(id)}
          onNext={() => (index < TOUR_STEPS.length - 1 ? setIndex(index + 1) : finish())}
          onPrev={() => setIndex(Math.max(index - 1, 0))}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour debe usarse dentro de TourProvider');
  return ctx;
};

/** Ref para marcar un elemento que el tutorial puede resaltar. */
export const useTourTarget = (id: string) => {
  const { registerTarget } = useTour();
  return useCallback((node: HostInstance | null) => registerTarget(id, node), [id, registerTarget]);
};
