import { AppointmentStatus, ChallengeCategory, FocusArea, RiskLevel } from './types';

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
// Orden de la semana empezando en lunes.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const avatarEmoji: Record<string, string> = { BEAR: '🐻', BUNNY: '🐰', FOX: '🦊', CAT: '🐱', CAPYBARA: '🦫' };

export const focusAreaLabels: Record<FocusArea, string> = {
  SELF_ESTEEM: 'Autoestima',
  ANXIETY: 'Ansiedad',
  EMOTIONAL_REGULATION: 'Regulación emocional',
  SELF_CARE: 'Autocuidado',
  RELATIONSHIPS: 'Relaciones',
  SELF_KNOWLEDGE: 'Autoconocimiento',
};

export const categoryLabels: Record<ChallengeCategory, string> = {
  SELF_KNOWLEDGE: 'Autoconocimiento',
  EMOTIONAL_SKILLS: 'Habilidades emocionales',
  SELF_CARE: 'Autocuidado',
};

export const statusLabels: Record<AppointmentStatus, { label: string; classes: string }> = {
  REQUESTED: { label: 'Por confirmar', classes: 'bg-peach-100 text-peach-700' },
  PENDING_PAYMENT: { label: 'Pago pendiente', classes: 'bg-peach-100 text-peach-700' },
  CONFIRMED: { label: 'Confirmada', classes: 'bg-leaf-100 text-leaf-700' },
  CANCELLED: { label: 'Cancelada', classes: 'bg-sand text-muted' },
  COMPLETED: { label: 'Completada', classes: 'bg-sky-100 text-sky-500' },
  NO_SHOW: { label: 'No asistió', classes: 'bg-danger-100 text-danger-500' },
};

export const riskLabels: Record<RiskLevel, { label: string; classes: string } | null> = {
  NONE: null,
  LOW: null,
  MODERATE: { label: 'Atención', classes: 'bg-peach-100 text-peach-700' },
  HIGH: { label: 'Riesgo alto', classes: 'bg-danger-100 text-danger-500' },
  IMMINENT: { label: 'Riesgo inminente', classes: 'bg-danger-500 text-white' },
};

export function formatDateTime(iso: string, timezone?: string): string {
  return new Intl.DateTimeFormat('es', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string, timezone?: string): string {
  return new Intl.DateTimeFormat('es', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatDate(iso: string, timezone?: string): string {
  return new Intl.DateTimeFormat('es', { timeZone: timezone, day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso),
  );
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function weekdaysLabel(days: number[]): string {
  if (days.length === 7) return 'Todos los días';
  return WEEK_ORDER.filter((d) => days.includes(d))
    .map((d) => WEEKDAYS_SHORT[d])
    .join(' · ');
}
