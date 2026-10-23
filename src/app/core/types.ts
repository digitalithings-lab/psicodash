// Tipos de las respuestas del backend usadas en el panel.

export type Role = 'USER' | 'PSYCHOLOGIST' | 'ADMIN';
export type RiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'IMMINENT';
export type AppointmentStatus = 'REQUESTED' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type EvidenceType = 'TEXT' | 'AUDIO' | 'PHOTO' | 'INTERACTIVE';
export type ChallengeCategory = 'SELF_KNOWLEDGE' | 'EMOTIONAL_SKILLS' | 'SELF_CARE';
export type FocusArea = 'SELF_ESTEEM' | 'ANXIETY' | 'EMOTIONAL_REGULATION' | 'SELF_CARE' | 'RELATIONSHIPS' | 'SELF_KNOWLEDGE';

export interface User {
  id: string;
  email: string;
  role: Role;
  profile: { displayName: string } | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PsyProfile {
  id: string;
  email?: string;
  fullName: string;
  licenseNumber: string;
  specialties: string[];
  bio: string | null;
  photoUrl: string | null;
  sessionPriceCents: number;
  currency: string;
  sessionMinutes: number;
  timezone: string;
  defaultMeetingUrl: string | null;
  linkCode: string;
  verified: boolean;
  active: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  modality: 'VIDEO' | 'IN_PERSON';
  meetingUrl: string | null;
  note: string | null;
  cancelReason: string | null;
}

export interface Dashboard {
  activePatients: number;
  pendingRequests: number;
  today: Appointment[];
  upcoming: Appointment[];
  recentResponses: {
    id: string;
    patientId: string;
    patientName: string;
    routineTitle: string;
    date: string;
    excerpt: string;
    riskLevel: RiskLevel | null;
  }[];
  riskAlerts: { patientId: string; patientName: string; routineTitle: string; riskLevel: RiskLevel; completedAt: string }[];
}

export interface PatientSummary {
  patientId: string;
  displayName: string;
  avatar: { species: string; name: string } | null;
  linkedAt: string;
  activeRoutines: number;
  weekCompletion: { completed: number; expected: number };
  lastActivityAt: string | null;
  nextAppointment: { id: string; startsAt: string; status: AppointmentStatus } | null;
}

export interface Routine {
  id: string;
  patientId: string;
  title: string;
  description: string;
  evidenceType: EvidenceType;
  reflectionPrompt: string | null;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  seedsReward: number;
  active: boolean;
  createdAt: string;
  totalCompletions?: number;
  week?: { expected: number; completed: number };
}

export interface PatientResponse {
  id: string;
  kind: 'routine' | 'daily';
  title: string;
  date: string;
  completedAt: string;
  textContent: string | null;
  reflection: string | null;
  riskLevel: RiskLevel | null;
}

export interface PatientDetail {
  patient: {
    id: string;
    displayName: string;
    avatar: { species: string; name: string } | null;
    focusAreas: FocusArea[];
    timezone: string;
    linkedAt: string;
  };
  settings: { autoChallengesPerDay: number };
  routines: Routine[];
  responses: PatientResponse[];
  appointments: Appointment[];
  contents: AssignedContent[];
}

export interface AssignedContent {
  id: string;
  title: string;
  kind: 'READING' | 'LINK';
  body: string | null;
  url: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CatalogChallenge {
  id: string;
  slug?: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  evidenceType: EvidenceType;
  reflectionPrompt: string | null;
  seedsReward: number;
  focusAreas?: FocusArea[];
  durationMinutes?: number | null;
  active?: boolean;
}

export interface AvailabilityRule {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface Availability {
  timezone: string;
  sessionMinutes: number;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
}

export interface AdminStats {
  patients: number;
  psychologists: number;
  linkedPatients: number;
  upcomingAppointments: number;
  pendingRiskEvents: number;
  activeLast24h: number;
}

export interface AdminPsychologist {
  id: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  specialties: string[];
  active: boolean;
  verified: boolean;
  activePatients: number;
  createdAt: string;
}

export interface CrisisResource {
  id: string;
  countryCode: string;
  name: string;
  phone: string | null;
  url: string | null;
  description: string | null;
  available24h: boolean;
  active: boolean;
  sortOrder: number;
}

export interface RiskEvent {
  id: string;
  userId: string;
  displayName: string | null;
  countryCode: string | null;
  source: string;
  level: RiskLevel;
  actionTaken: string | null;
  createdAt: string;
  reviewedAt: string | null;
  notes: string | null;
}
