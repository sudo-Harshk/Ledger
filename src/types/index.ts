import { Timestamp } from 'firebase/firestore';
import { UserInfo } from 'firebase/auth';

// Firebase Auth Types
export type ProviderId = 'google.com' | 'github.com' | 'password' | string;

export interface ProviderData extends UserInfo {
  providerId: ProviderId;
}

// Student Types
export interface StudentAccount {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string;
  monthlyFee: number;
  createdAt: Date | Timestamp;
  totalDueByMonth?: TotalDueByMonth;
  createdBy?: string;
}

export interface TotalDueByMonth {
  [monthKey: string]: TotalDueEntry | number;
}

export interface TotalDueEntry {
  due: number;
  status: string | null;
  paymentDate?: Timestamp | Date;
}

// Attendance Types
export interface AttendanceRecord {
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'absent';
  timestamp: Date | Timestamp;
}

export interface AttendanceDocument {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'absent';
  timestamp: Date | Timestamp;
  month?: number;
  year?: number;
  approvedBy?: string;
  approvedAt?: Date | Timestamp;
}

export interface PendingRequest {
  id: string;
  studentName: string;
  date: string;
  timestamp: Timestamp | Date;
  status: 'pending' | 'approved' | 'rejected' | 'absent';
  studentId?: string;
  month?: number;
  year?: number;
  approvedBy?: string;
  approvedAt?: Date | Timestamp;
}

// Financial Types
export interface FinancialSummary {
  revenue: number;
  lastUpdated: Timestamp | null;
}

export interface FeeSummary {
  totalDays: number;
  absentDays: number;
  monthlyFee: number;
  totalAmount: number;
}

// Document Snapshot Types
export interface DocumentSnapshotData {
  [key: string]: unknown;
}

// Confetti Types
export type ConfettiTrigger = number | string | boolean | null | undefined;

// Error Types (for error handling)
export interface FirebaseError {
  code: string;
  message: string;
  stack?: string;
}

// Utility type for Firebase Timestamp conversions
export type TimestampLike = Timestamp | Date | string | number;

