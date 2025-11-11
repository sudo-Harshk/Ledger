import { Timestamp } from 'firebase/firestore';
import type { UserInfo } from 'firebase/auth';

export type ProviderId = 'google.com' | 'github.com' | 'password' | string;

export interface ProviderData extends UserInfo {
  providerId: ProviderId;
}

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
  isActive?: boolean;
}

export interface TotalDueByMonth {
  [monthKey: string]: TotalDueEntry | number;
}

export interface TotalDueEntry {
  due: number;
  status: string | null;
  paymentDate?: Timestamp | Date;
}

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

export interface DocumentSnapshotData {
  [key: string]: unknown;
}

export type ConfettiTrigger = number | string | boolean | null | undefined;

export interface FirebaseError {
  code: string;
  message: string;
  stack?: string;
}

export type TimestampLike = Timestamp | Date | string | number;

