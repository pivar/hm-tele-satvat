import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  patients,
  otpSessions,
  consultations,
  type Patient,
  type InsertPatient,
  type OtpSession,
  type InsertOtpSession,
  type Consultation,
  type InsertConsultation,
} from "@shared/schema";

export interface IStorage {
  // Patient operations
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByMobile(mobile: string): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  getPatientByIdentifier(identifier: string): Promise<Patient | undefined>;
  createPatient(data: Partial<InsertPatient>): Promise<Patient>;
  updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined>;

  // OTP operations
  createOtpSession(data: InsertOtpSession): Promise<OtpSession>;
  getActiveOtpSession(identifier: string): Promise<OtpSession | undefined>;
  markOtpUsed(id: string): Promise<void>;
  incrementOtpAttempts(id: string): Promise<void>;

  // Consultation operations
  getConsultationsByPatient(patientId: string): Promise<Consultation[]>;
  getConsultation(id: string): Promise<Consultation | undefined>;
  createConsultation(data: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: string, data: Partial<InsertConsultation>): Promise<Consultation | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Patient operations
  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return patient;
  }

  async getPatientByMobile(mobile: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.mobile, mobile)).limit(1);
    return patient;
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.email, email)).limit(1);
    return patient;
  }

  async getPatientByIdentifier(identifier: string): Promise<Patient | undefined> {
    // Check if identifier is email or mobile
    if (identifier.includes("@")) {
      return this.getPatientByEmail(identifier);
    }
    return this.getPatientByMobile(identifier);
  }

  async createPatient(data: Partial<InsertPatient>): Promise<Patient> {
    const [patient] = await db.insert(patients).values(data as InsertPatient).returning();
    return patient;
  }

  async updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set({ ...data, isProfileComplete: true })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // OTP operations
  async createOtpSession(data: InsertOtpSession): Promise<OtpSession> {
    const [session] = await db.insert(otpSessions).values(data).returning();
    return session;
  }

  async getActiveOtpSession(identifier: string): Promise<OtpSession | undefined> {
    const now = new Date();
    const sessions = await db
      .select()
      .from(otpSessions)
      .where(eq(otpSessions.identifier, identifier));

    // Find the most recent unexpired, unused session
    const validSessions = sessions
      .filter(s => !s.isUsed && new Date(s.expiresAt) > now)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    return validSessions[0];
  }

  async markOtpUsed(id: string): Promise<void> {
    await db.update(otpSessions).set({ isUsed: true }).where(eq(otpSessions.id, id));
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    const [session] = await db.select().from(otpSessions).where(eq(otpSessions.id, id)).limit(1);
    if (session) {
      await db
        .update(otpSessions)
        .set({ attempts: (session.attempts || 0) + 1 })
        .where(eq(otpSessions.id, id));
    }
  }

  // Consultation operations
  async getConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    return db
      .select()
      .from(consultations)
      .where(eq(consultations.patientId, patientId))
      .orderBy(consultations.createdAt);
  }

  async getConsultation(id: string): Promise<Consultation | undefined> {
    const [consultation] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, id))
      .limit(1);
    return consultation;
  }

  async createConsultation(data: InsertConsultation): Promise<Consultation> {
    const [consultation] = await db.insert(consultations).values(data).returning();
    return consultation;
  }

  async updateConsultation(
    id: string,
    data: Partial<InsertConsultation>
  ): Promise<Consultation | undefined> {
    const [consultation] = await db
      .update(consultations)
      .set(data)
      .where(eq(consultations.id, id))
      .returning();
    return consultation;
  }
}

export const storage = new DatabaseStorage();
