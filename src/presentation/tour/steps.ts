import { PREMIUM_ENABLED } from '../../config/features';

export interface TourStep {
  id: string;
  // Elemento que se resalta (registrado con useTourTarget). Sin target, el globo sale centrado.
  target?: string;
  // Espacio extra bajo el elemento, p. ej. para incluir el nombre debajo de un ícono de pestaña
  extendBottom?: number;
  title: string;
  text: string;
}

// Orden pensado para configurar la finca: equipo → tareas → bloques → registrar → consultar
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a Rinde',
    text: 'En un minuto te mostramos cómo llevar el rendimiento de tu finca. Si ya sabes usarla, puedes saltar el tutorial y verlo después desde el menú.',
  },
  {
    id: 'workers',
    target: 'tab-people',
    extendBottom: 20,
    title: '1. Agrega a tu equipo',
    text: 'En Equipo registras a cada trabajador con su nombre, código y cargo.',
  },
  {
    id: 'activities',
    target: 'tab-assignment',
    extendBottom: 20,
    title: '2. Crea las tareas',
    text: 'Cada labor lleva su unidad (tallos, camas, plantas) y la meta por hora. Con esa meta, Rinde calcula quién cumplió.',
  },
  {
    id: 'menu',
    target: 'menu',
    title: '3. Crea los bloques',
    text: PREMIUM_ENABLED
      ? 'En el menú están Bloques, Metas semanales, Ausencias, Estadísticas y Respaldo. Necesitas al menos un bloque para registrar turnos.'
      : 'En el menú están Bloques, Ausencias y Respaldo. Necesitas al menos un bloque para registrar turnos.',
  },
  {
    id: 'add',
    target: 'add-record',
    title: '4. Registra el rendimiento',
    text: 'Elige el trabajador, la tarea, el horario, el bloque y la cantidad. Si la persona trabajó en varias tareas, agrega otro turno en el mismo registro.',
  },
  {
    id: 'date',
    target: 'date',
    title: 'Cambia de día',
    text: 'Con las flechas ves o registras días anteriores. Toca la fecha para volver a hoy.',
  },
  {
    id: 'stats',
    target: 'stats',
    title: 'Resumen del día',
    text: 'Cuántos registros hay, cuántos trabajadores cumplieron la meta y cuántos no.',
  },
  {
    id: 'history',
    target: 'tab-history',
    extendBottom: 20,
    title: 'Historial',
    text: 'Consulta y corrige los registros de días anteriores.',
  },
  {
    id: 'export',
    target: 'tab-file-download',
    extendBottom: 20,
    title: 'Reportes en Excel',
    text: PREMIUM_ENABLED
      ? 'Saca el reporte semanal, el plan de trabajo (meta contra lo realizado) o el detalle por trabajador o tarea, y compártelo por WhatsApp o correo.'
      : 'Saca el reporte semanal con el resumen y el detalle por trabajador, y compártelo por WhatsApp o correo.',
  },
  {
    id: 'done',
    title: 'Todo listo',
    text: 'Haz un respaldo cada semana desde Menú → Respaldo para no perder los datos. Puedes volver a ver este tutorial en Menú → Ver tutorial.',
  },
];
