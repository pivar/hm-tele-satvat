from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.sql import func
from backend.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True)
    mobile = Column(Text, unique=True, nullable=True)
    email = Column(Text, unique=True, nullable=True)
    full_name = Column(Text, name="full_name", nullable=False, default="")
    age = Column(Integer, nullable=False, default=0)
    gender = Column(Text, nullable=False, default="other")
    city = Column(Text)
    state = Column(Text)
    pincode = Column(Text)
    height = Column(Text)
    weight = Column(Text)
    blood_group = Column(Text, name="blood_group")
    existing_conditions = Column(Text, name="existing_conditions")
    current_medications = Column(Text, name="current_medications")
    lifestyle = Column(Text)
    is_profile_complete = Column(Boolean, name="is_profile_complete", default=False)
    created_at = Column(DateTime, server_default=func.now(), name="created_at")

class OTPSession(Base):
    __tablename__ = "otp_sessions"

    id = Column(String, primary_key=True)
    identifier = Column(Text, nullable=False)
    otp = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=False, name="expires_at")
    is_used = Column(Boolean, name="is_used", default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), name="created_at")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, name="patient_id")
    status = Column(Text, default="pending", nullable=False)
    audio_url = Column(Text, name="audio_url")
    transcript = Column(Text)
    duration = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), name="created_at")
    completed_at = Column(DateTime, name="completed_at")

class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(String, primary_key=True)
    name = Column(Text, nullable=False)
    address = Column(Text, default="")
    city = Column(Text, default="")
    state = Column(Text, default="")
    contact_number = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), name="created_at")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String, primary_key=True)
    full_name = Column(Text, name="full_name", nullable=False)
    specialization = Column(Text, nullable=False, default="Homeopathy")
    clinic_id = Column(String, ForeignKey("clinics.id"), nullable=True, name="clinic_id")
    mobile = Column(Text, unique=True, nullable=True)
    email = Column(Text, unique=True, nullable=True)
    experience_years = Column(Integer, name="experience_years", default=0)
    rating = Column(Float, default=4.5)
    consultation_fee = Column(Integer, name="consultation_fee", default=500)
    available_days = Column(Text, name="available_days", default="Mon,Tue,Wed,Thu,Fri")
    available_time_start = Column(Text, name="available_time_start", default="09:00")
    available_time_end = Column(Text, name="available_time_end", default="17:00")
    is_active = Column(Boolean, name="is_active", default=True)
    avatar_color = Column(Text, name="avatar_color", default="#0d9488")
    created_at = Column(DateTime, server_default=func.now(), name="created_at")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, name="patient_id")
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, name="doctor_id")
    appointment_date = Column(Text, name="appointment_date", nullable=False)
    appointment_time = Column(Text, name="appointment_time", nullable=False)
    status = Column(Text, default="scheduled", nullable=False)  # scheduled, completed, cancelled
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now(), name="created_at")
