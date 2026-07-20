import os
import random
import string
import uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from backend.database import get_db, engine, Base
from backend.models import Patient, OTPSession, Consultation, Doctor, Appointment, Clinic
from backend.schemas import OTPRequest, OTPVerify, PatientProfile, AppointmentCreate, DoctorProfile, AppointmentStatusUpdate


Base.metadata.create_all(bind=engine)

app = FastAPI(title="HomeoHealth API")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret-key"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def patient_to_response(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "mobile": patient.mobile,
        "email": patient.email,
        "fullName": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "city": patient.city,
        "state": patient.state,
        "pincode": patient.pincode,
        "height": patient.height,
        "weight": patient.weight,
        "bloodGroup": patient.blood_group,
        "existingConditions": patient.existing_conditions,
        "currentMedications": patient.current_medications,
        "lifestyle": patient.lifestyle,
        "isProfileComplete": patient.is_profile_complete,
        "createdAt": patient.created_at.isoformat() if patient.created_at else None
    }

def clinic_to_response(c: Clinic) -> dict:
    if not c:
        return None
    return {
        "id": c.id,
        "name": c.name,
        "address": c.address,
        "city": c.city,
        "state": c.state,
        "contactNumber": c.contact_number,
        "createdAt": c.created_at.isoformat() if c.created_at else None
    }

def doctor_to_response(d: Doctor, c: Clinic = None) -> dict:
    return {
        "id": d.id,
        "fullName": d.full_name,
        "specialization": d.specialization,
        "clinic": clinic_to_response(c),
        "mobile": d.mobile,
        "email": d.email,
        "experienceYears": d.experience_years,
        "rating": d.rating,
        "consultationFee": d.consultation_fee,
        "availableDays": d.available_days,
        "availableTimeStart": d.available_time_start,
        "availableTimeEnd": d.available_time_end,
        "isActive": d.is_active,
        "avatarColor": d.avatar_color,
        "createdAt": d.created_at.isoformat() if d.created_at else None
    }

def appointment_to_response(a: Appointment, doctor_name: str = None) -> dict:
    return {
        "id": a.id,
        "patientId": a.patient_id,
        "doctorId": a.doctor_id,
        "appointmentDate": a.appointment_date,
        "appointmentTime": a.appointment_time,
        "status": a.status,
        "notes": a.notes,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "doctorName": doctor_name
    }

def consultation_to_response(c: Consultation) -> dict:
    return {
        "id": c.id,
        "patientId": c.patient_id,
        "audioUrl": c.audio_url,
        "transcript": c.transcript,
        "duration": c.duration,
        "notes": c.notes,
        "status": c.status,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "completedAt": c.completed_at.isoformat() if c.completed_at else None
    }

@app.post("/api/auth/request-otp")
async def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Mobile or email is required")

    otp = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=10)

    otp_session = OTPSession(
        id=str(uuid.uuid4()),
        identifier=identifier,
        otp=otp,
        expires_at=expires_at,
        is_used=False,
        attempts=0
    )
    db.add(otp_session)
    db.commit()

    print(f"OTP for {identifier}: {otp}")

    return {"message": "OTP sent successfully", "otp": otp}

@app.post("/api/auth/verify-otp")
async def verify_otp(data: OTPVerify, request: Request, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    otp = data.otp.strip()

    otp_session = db.query(OTPSession).filter(
        OTPSession.identifier == identifier,
        OTPSession.is_used == False
    ).order_by(OTPSession.created_at.desc()).first()

    if not otp_session:
        raise HTTPException(status_code=400, detail="OTP expired or invalid. Please request a new one.")

    if otp_session.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="OTP has expired")

    if otp_session.attempts and otp_session.attempts >= 3:
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    if otp_session.otp != otp:
        otp_session.attempts = (otp_session.attempts or 0) + 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")

    otp_session.is_used = True
    db.commit()

    is_email = "@" in identifier
    if is_email:
        patient = db.query(Patient).filter(Patient.email == identifier).first()
    else:
        patient = db.query(Patient).filter(Patient.mobile == identifier).first()

    is_new_user = patient is None

    if is_new_user:
        patient = Patient(
            id=str(uuid.uuid4()),
            mobile=None if is_email else identifier,
            email=identifier if is_email else None,
            full_name="",
            age=0,
            gender="other",
            is_profile_complete=False
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    request.session["patient_id"] = patient.id

    return {
        "message": "OTP verified successfully",
        "patient": patient_to_response(patient),
        "isNewUser": is_new_user or not patient.is_profile_complete
    }

@app.get("/api/auth/me")
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    patient_id = request.session.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=401, detail="Patient not found")

    return {"patient": patient_to_response(patient)}

@app.post("/api/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}

@app.put("/api/patient/profile")
async def update_profile(data: PatientProfile, request: Request, db: Session = Depends(get_db)):
    patient_id = request.session.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.full_name = data.fullName
    patient.age = data.age
    patient.gender = data.gender
    if data.mobile:
        patient.mobile = data.mobile
    if data.email:
        patient.email = data.email
    patient.city = data.city or ""
    patient.state = data.state or ""
    patient.pincode = data.pincode or ""
    patient.height = data.height or ""
    patient.weight = data.weight or ""
    patient.blood_group = data.bloodGroup or ""
    patient.existing_conditions = data.existingConditions or ""
    patient.current_medications = data.currentMedications or ""
    patient.lifestyle = data.lifestyle or ""
    patient.is_profile_complete = True

    db.commit()
    db.refresh(patient)

    return {"patient": patient_to_response(patient)}

@app.get("/api/consultations")
async def get_consultations(request: Request, db: Session = Depends(get_db)):
    patient_id = request.session.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    consultations = db.query(Consultation).filter(
        Consultation.patient_id == patient_id
    ).order_by(Consultation.created_at.desc()).all()

    return [consultation_to_response(c) for c in consultations]

@app.post("/api/consultations")
async def create_consultation(
    request: Request,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    patient_id = request.session.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    filename = f"{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{audio.filename}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as f:
        content = await audio.read()
        f.write(content)

    transcripts = [
        "Patient describes experiencing mild headaches for the past week, primarily in the morning.",
        "Patient reports digestive issues including occasional bloating and discomfort after meals.",
        "Patient mentions experiencing fatigue and low energy levels, especially in the afternoon.",
        "Patient describes joint pain in the knees, particularly noticeable when climbing stairs.",
        "Patient reports seasonal allergies with symptoms including sneezing and runny nose.",
    ]
    transcript = random.choice(transcripts)

    consultation = Consultation(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        audio_url=f"/uploads/{filename}",
        transcript=transcript,
        status="pending"
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return consultation_to_response(consultation)

# --- Doctor endpoints ---

SEED_DOCTORS = [
    {
        "id": "doc-001",
        "full_name": "Dr. Ananya Sharma",
        "specialization": "Classical Homeopathy",
        "clinic_name": "Sharma Homeo Clinic",
        "clinic_address": "42, MG Road, Sector 14",
        "city": "Gurugram",
        "state": "Haryana",
        "mobile": "9876543210",
        "email": "ananya@homeohealth.in",
        "experience_years": 12,
        "rating": 4.8,
        "consultation_fee": 800,
        "available_days": "Mon,Tue,Wed,Thu,Fri",
        "available_time_start": "09:00",
        "available_time_end": "17:00",
        "is_active": True,
        "avatar_color": "#0d9488"
    },
    {
        "id": "doc-002",
        "full_name": "Dr. Rajiv Mehta",
        "specialization": "Pediatric Homeopathy",
        "clinic_name": "Mehta Children's Wellness",
        "clinic_address": "B-12, Green Park Extension",
        "city": "New Delhi",
        "state": "Delhi",
        "mobile": "9876543211",
        "email": "rajiv@homeohealth.in",
        "experience_years": 18,
        "rating": 4.9,
        "consultation_fee": 1000,
        "available_days": "Mon,Wed,Fri,Sat",
        "available_time_start": "10:00",
        "available_time_end": "18:00",
        "is_active": True,
        "avatar_color": "#7c3aed"
    },
    {
        "id": "doc-003",
        "full_name": "Dr. Priya Venkatesh",
        "specialization": "Dermatology & Homeopathy",
        "clinic_name": "Venkatesh Skin & Homeo Centre",
        "clinic_address": "15, Anna Nagar Main Road",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "mobile": "9876543212",
        "email": "priya@homeohealth.in",
        "experience_years": 8,
        "rating": 4.6,
        "consultation_fee": 600,
        "available_days": "Mon,Tue,Thu,Fri,Sat",
        "available_time_start": "08:30",
        "available_time_end": "16:30",
        "is_active": True,
        "avatar_color": "#e11d48"
    },
    {
        "id": "doc-004",
        "full_name": "Dr. Suresh Patil",
        "specialization": "Chronic Disease Management",
        "clinic_name": "Patil Homeopathic Hospital",
        "clinic_address": "78, FC Road, Shivajinagar",
        "city": "Pune",
        "state": "Maharashtra",
        "mobile": "9876543213",
        "email": "suresh@homeohealth.in",
        "experience_years": 22,
        "rating": 4.7,
        "consultation_fee": 900,
        "available_days": "Mon,Tue,Wed,Thu,Fri",
        "available_time_start": "09:30",
        "available_time_end": "17:30",
        "is_active": True,
        "avatar_color": "#2563eb"
    },
    {
        "id": "doc-005",
        "full_name": "Dr. Kavita Reddy",
        "specialization": "Women's Health & Homeopathy",
        "clinic_name": "Reddy Wellness Clinic",
        "clinic_address": "23, Jubilee Hills Road No.5",
        "city": "Hyderabad",
        "state": "Telangana",
        "mobile": "9876543214",
        "email": "kavita@homeohealth.in",
        "experience_years": 15,
        "rating": 4.9,
        "consultation_fee": 750,
        "available_days": "Tue,Wed,Thu,Fri,Sat",
        "available_time_start": "10:00",
        "available_time_end": "19:00",
        "is_active": True,
        "avatar_color": "#d97706"
    }
]

@app.on_event("startup")
async def seed_doctors():
    db = next(get_db())
    try:
        existing = db.query(Doctor).count()
        if existing == 0:
            clinics_map = {}
            for doc_data in SEED_DOCTORS:
                data = doc_data.copy()
                c_name = data.pop("clinic_name")
                c_address = data.pop("clinic_address")
                c_city = data.pop("city")
                c_state = data.pop("state")

                if c_name not in clinics_map:
                    clinic_id = "clinic-" + str(uuid.uuid4())[:8]
                    clinic = Clinic(id=clinic_id, name=c_name, address=c_address, city=c_city, state=c_state)
                    db.add(clinic)
                    clinics_map[c_name] = clinic_id

                data["clinic_id"] = clinics_map[c_name]
                doc = Doctor(**data)
                db.add(doc)
            db.commit()
            print(f"Seeded {len(SEED_DOCTORS)} doctors and their clinics")
        else:
            print(f"Doctors table already has {existing} records, skipping seed")
    except Exception as e:
        print(f"Error seeding doctors: {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/api/clinics")
async def get_clinics(db: Session = Depends(get_db)):
    clinics = db.query(Clinic).all()
    return [clinic_to_response(c) for c in clinics]

@app.get("/api/doctors")
async def get_doctors(clinicId: str = None, db: Session = Depends(get_db)):
    query = db.query(Doctor).filter(Doctor.is_active == True)
    if clinicId:
        query = query.filter(Doctor.clinic_id == clinicId)
    doctors = query.all()
    result = []
    for d in doctors:
        clinic = db.query(Clinic).filter(Clinic.id == d.clinic_id).first()
        result.append(doctor_to_response(d, clinic))
    return result

@app.get("/api/doctors/{doctor_id}")
async def get_doctor(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    clinic = db.query(Clinic).filter(Clinic.id == doctor.clinic_id).first()
    return doctor_to_response(doctor, clinic)

@app.post("/api/appointments")
async def create_appointment(data: AppointmentCreate, request: Request, db: Session = Depends(get_db)):
    patient_id = request.session.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    doctor = db.query(Doctor).filter(Doctor.id == data.doctorId).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check for conflicting appointment
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == data.doctorId,
        Appointment.appointment_date == data.appointmentDate,
        Appointment.appointment_time == data.appointmentTime,
        Appointment.status != "cancelled"
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    appointment = Appointment(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        doctor_id=data.doctorId,
        appointment_date=data.appointmentDate,
        appointment_time=data.appointmentTime,
        notes=data.notes or "",
        status="scheduled"
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment_to_response(appointment, doctor.full_name)

@app.get("/api/appointments")
async def get_appointments(request: Request, db: Session = Depends(get_db)):
    patient_id = request.session.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).order_by(Appointment.created_at.desc()).all()

    result = []
    for a in appointments:
        doctor = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
        doctor_name = doctor.full_name if doctor else "Unknown"
        result.append(appointment_to_response(a, doctor_name))

    return result

# --- Doctor Auth endpoints ---

@app.post("/api/doctor/auth/request-otp")
async def doctor_request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Mobile or email is required")

    # Check if a doctor with this identifier exists
    is_email = "@" in identifier
    if is_email:
        doctor = db.query(Doctor).filter(Doctor.email == identifier).first()
    else:
        doctor = db.query(Doctor).filter(Doctor.mobile == identifier).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor account found with this identifier. Please contact admin.")

    otp = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=10)

    otp_session = OTPSession(
        id=str(uuid.uuid4()),
        identifier=identifier,
        otp=otp,
        expires_at=expires_at,
        is_used=False,
        attempts=0
    )
    db.add(otp_session)
    db.commit()

    print(f"Doctor OTP for {identifier}: {otp}")

    return {"message": "OTP sent successfully", "otp": otp}

@app.post("/api/doctor/auth/verify-otp")
async def doctor_verify_otp(data: OTPVerify, request: Request, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    otp = data.otp.strip()

    otp_session = db.query(OTPSession).filter(
        OTPSession.identifier == identifier,
        OTPSession.is_used == False
    ).order_by(OTPSession.created_at.desc()).first()

    if not otp_session:
        raise HTTPException(status_code=400, detail="OTP expired or invalid. Please request a new one.")

    if otp_session.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="OTP has expired")

    if otp_session.attempts and otp_session.attempts >= 3:
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    if otp_session.otp != otp:
        otp_session.attempts = (otp_session.attempts or 0) + 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")

    otp_session.is_used = True
    db.commit()

    is_email = "@" in identifier
    if is_email:
        doctor = db.query(Doctor).filter(Doctor.email == identifier).first()
    else:
        doctor = db.query(Doctor).filter(Doctor.mobile == identifier).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    request.session["doctor_id"] = doctor.id

    clinic = db.query(Clinic).filter(Clinic.id == doctor.clinic_id).first()

    return {
        "message": "OTP verified successfully",
        "doctor": doctor_to_response(doctor, clinic)
    }

@app.get("/api/doctor/auth/me")
async def get_current_doctor(request: Request, db: Session = Depends(get_db)):
    doctor_id = request.session.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=401, detail="Doctor not found")

    clinic = db.query(Clinic).filter(Clinic.id == doctor.clinic_id).first()

    return {"doctor": doctor_to_response(doctor, clinic)}

@app.post("/api/doctor/auth/logout")
async def doctor_logout(request: Request):
    request.session.pop("doctor_id", None)
    return {"message": "Logged out successfully"}

@app.put("/api/doctor/profile")
async def update_doctor_profile(data: DoctorProfile, request: Request, db: Session = Depends(get_db)):
    doctor_id = request.session.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor.full_name = data.fullName
    if data.specialization is not None:
        doctor.specialization = data.specialization
    if data.consultationFee is not None:
        doctor.consultation_fee = data.consultationFee
    if data.experienceYears is not None:
        doctor.experience_years = data.experienceYears
    if data.availableDays is not None:
        doctor.available_days = data.availableDays
    if data.availableTimeStart is not None:
        doctor.available_time_start = data.availableTimeStart
    if data.availableTimeEnd is not None:
        doctor.available_time_end = data.availableTimeEnd
    if data.mobile is not None:
        doctor.mobile = data.mobile
    if data.email is not None:
        doctor.email = data.email
    if data.avatarColor is not None:
        doctor.avatar_color = data.avatarColor

    db.commit()
    db.refresh(doctor)

    clinic = db.query(Clinic).filter(Clinic.id == doctor.clinic_id).first()

    return {"doctor": doctor_to_response(doctor, clinic)}

@app.get("/api/doctor/appointments")
async def get_doctor_appointments(request: Request, db: Session = Depends(get_db)):
    doctor_id = request.session.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id
    ).order_by(Appointment.created_at.desc()).all()

    result = []
    for a in appointments:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        patient_name = patient.full_name if patient else "Unknown Patient"
        resp = appointment_to_response(a)
        resp["patientName"] = patient_name
        resp["patientMobile"] = patient.mobile if patient else None
        resp["patientEmail"] = patient.email if patient else None
        result.append(resp)

    return result

@app.put("/api/doctor/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    data: AppointmentStatusUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    doctor_id = request.session.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if data.status not in ["completed", "cancelled", "scheduled"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: completed, cancelled, or scheduled")

    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == doctor_id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.status = data.status
    db.commit()
    db.refresh(appointment)

    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
    patient_name = patient.full_name if patient else "Unknown Patient"
    resp = appointment_to_response(appointment)
    resp["patientName"] = patient_name

    return resp

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
