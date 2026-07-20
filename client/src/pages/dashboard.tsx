import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Stethoscope,
  User,
  Mic,
  History,
  LogOut,
  Settings,
  Phone,
  Mail,
  MapPin,
  Activity,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  ChevronRight,
  Star,
  Loader2,
  IndianRupee,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Consultation } from "@shared/schema";

// --- Types ---

interface Clinic {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  contactNumber?: string;
}

interface Doctor {
  id: string;
  fullName: string;
  specialization: string;
  clinic?: Clinic;
  mobile?: string;
  email?: string;
  experienceYears: number;
  rating: number;
  consultationFee: number;
  availableDays?: string;
  availableTimeStart?: string;
  availableTimeEnd?: string;
  isActive: boolean;
  avatarColor?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string;
  createdAt?: string;
  doctorName?: string;
}

// --- Helpers ---

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusColor(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "secondary";
  }
}

function getAppointmentStatusColor(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "scheduled":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let currentH = startH;
  let currentM = startM;

  while (currentH < endH || (currentH === endH && currentM < endM)) {
    slots.push(
      `${currentH.toString().padStart(2, "0")}:${currentM.toString().padStart(2, "0")}`
    );
    currentM += 30;
    if (currentM >= 60) {
      currentM = 0;
      currentH++;
    }
  }
  return slots;
}

function formatTimeSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${suffix}`;
}

// --- Main Dashboard ---

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { patient, logout, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "consultation" | "history">("overview");

  const { data: consultations, isLoading: consultationsLoading } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations"],
    enabled: !!patient,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    navigate("/");
    return null;
  }

  const recentConsultations = consultations?.slice(0, 3) || [];
  const completedCount = consultations?.filter((c) => c.status === "completed").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">HomeoHealth</h1>
              <p className="text-xs text-muted-foreground">Telemedicine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/register")}
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                navigate("/");
              }}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {patient.fullName?.charAt(0)?.toUpperCase() || "P"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-patient-name">
                {patient.fullName || "Patient"}
              </h2>
              <p className="text-muted-foreground">
                {patient.age} years • {patient.gender}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("overview")}
            data-testid="tab-overview"
          >
            <User className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === "doctors" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("doctors")}
            data-testid="tab-doctors"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Find Clinics
          </Button>
          <Button
            variant={activeTab === "consultation" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("consultation")}
            data-testid="tab-consultation"
          >
            <Mic className="w-4 h-4 mr-2" />
            New Consultation
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("history")}
            data-testid="tab-history"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </div>

        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Mobile:</span>
                      <span className="text-foreground" data-testid="text-mobile">
                        +91 {patient.mobile}
                      </span>
                    </div>
                    {patient.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-foreground">{patient.email}</span>
                      </div>
                    )}
                    {patient.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="text-foreground">
                          {patient.city}
                          {patient.state && `, ${patient.state}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {patient.bloodGroup && (
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Blood Group:</span>
                        <Badge variant="secondary">{patient.bloodGroup}</Badge>
                      </div>
                    )}
                    {patient.height && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Height:</span>
                        <span className="text-foreground">{patient.height} cm</span>
                      </div>
                    )}
                    {patient.weight && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="text-foreground">{patient.weight} kg</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/register")}
                  data-testid="button-edit-profile"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Consultations</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total-consultations">
                    {consultations?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-2xl font-bold text-foreground">
                    {completedCount}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Recent Consultations
                  </CardTitle>
                  <CardDescription>Your latest consultation sessions</CardDescription>
                </div>
                {consultations && consultations.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("history")}
                    data-testid="button-view-all"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {consultationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentConsultations.length > 0 ? (
                  <div className="space-y-3">
                    {recentConsultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                        data-testid={`consultation-${consultation.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Consultation #{consultation.id.slice(0, 8)}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarIcon className="w-3 h-3" />
                              {formatDate(consultation.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {consultation.duration && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDuration(consultation.duration)}
                            </div>
                          )}
                          <Badge variant={getStatusColor(consultation.status)}>
                            {consultation.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No consultations yet</p>
                    <Button onClick={() => setActiveTab("consultation")} data-testid="button-start-first">
                      <Mic className="w-4 h-4 mr-2" />
                      Start Your First Consultation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "doctors" && (
          <DoctorsList />
        )}

        {activeTab === "consultation" && (
          <ConsultationRecorder patientId={patient.id} />
        )}

        {activeTab === "history" && (
          <ConsultationHistory consultations={consultations || []} isLoading={consultationsLoading} />
        )}
      </main>
    </div>
  );
}

// --- Doctors List with Booking ---

function DoctorsList() {
  const { toast } = useToast();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  const { data: clinics, isLoading: clinicsLoading } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"],
  });

  const { data: doctors, isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: [`/api/doctors?clinicId=${selectedClinicId}`],
    enabled: !!selectedClinicId,
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const bookAppointment = useMutation({
    mutationFn: async (payload: { doctorId: string; appointmentDate: string; appointmentTime: string }) => {
      const response = await apiRequest("POST", "/api/appointments", payload);
      return response.json();
    },
    onSuccess: () => {
      setBookingSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Booked!",
        description: `Your appointment with ${selectedDoctor?.fullName} has been confirmed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Could not book the appointment. Try another slot.",
        variant: "destructive",
      });
    },
  });

  function openBooking(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setBookingSuccess(false);
    setBookingDialogOpen(true);
  }

  function handleBooking() {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    bookAppointment.mutate({
      doctorId: selectedDoctor.id,
      appointmentDate: dateStr,
      appointmentTime: selectedTime,
    });
  }

  function isDayAvailable(date: Date, doctor: Doctor): boolean {
    if (!doctor.availableDays) return false;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayNames[date.getDay()];
    return doctor.availableDays.includes(dayName);
  }

  const timeSlots =
    selectedDoctor?.availableTimeStart && selectedDoctor?.availableTimeEnd
      ? generateTimeSlots(selectedDoctor.availableTimeStart, selectedDoctor.availableTimeEnd)
      : [];

  const upcomingAppointments = appointments?.filter((a) => a.status === "scheduled") || [];

  return (
    <div className="space-y-6">
      {/* Upcoming Appointments Section */}
      {upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Your Upcoming Appointments
            </CardTitle>
            <CardDescription>Scheduled one-on-one sessions with doctors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                  data-testid={`appointment-${apt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{apt.doctorName}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(apt.appointmentDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeSlot(apt.appointmentTime)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant={getAppointmentStatusColor(apt.status)}>
                    {apt.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinic/Doctor Listing */}
      <div>
        {!selectedClinicId ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Available Clinics</h3>
                <p className="text-sm text-muted-foreground">
                  Select a clinic to view available doctors and book an appointment
                </p>
              </div>
            </div>

            {clinicsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
              </div>
            ) : clinics && clinics.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {clinics.map((clinic) => (
                  <Card
                    key={clinic.id}
                    className="overflow-hidden hover-elevate transition-all cursor-pointer"
                    onClick={() => setSelectedClinicId(clinic.id)}
                    data-testid={`clinic-card-${clinic.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-base truncate">
                            {clinic.name}
                          </h4>
                          <div className="space-y-1 mt-2">
                            {clinic.address && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground truncate">
                                  {clinic.address}{clinic.city && `, ${clinic.city}`}
                                </span>
                              </div>
                            )}
                            {clinic.contactNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground truncate">{clinic.contactNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button variant="ghost" size="sm" className="w-full pointer-events-none">
                          View Doctors <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No clinics available</h3>
                    <p className="text-muted-foreground">
                      Clinics will appear here once they register on the platform
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6 block w-full border-b pb-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedClinicId(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="ml-2">
                <h3 className="text-lg font-semibold text-foreground">Clinic Doctors</h3>
                <p className="text-sm text-muted-foreground">
                  {clinics?.find(c => c.id === selectedClinicId)?.name || 'Select a doctor'}
                </p>
              </div>
            </div>

            {doctorsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-lg" />
                ))}
              </div>
            ) : doctors && doctors.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {doctors.map((doctor) => (
                  <Card
                    key={doctor.id}
                    className="overflow-hidden hover-elevate transition-all"
                    data-testid={`doctor-card-${doctor.id}`}
                  >
                    <CardContent className="p-0">
                      {/* Color bar at top */}
                      <div
                        className="h-2 w-full"
                        style={{ backgroundColor: doctor.avatarColor || "#0d9488" }}
                      />
                      <div className="p-5">
                        {/* Doctor header */}
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-14 h-14 border-2" style={{ borderColor: doctor.avatarColor || "#0d9488" }}>
                            <AvatarFallback
                              className="text-lg font-bold text-white"
                              style={{ backgroundColor: doctor.avatarColor || "#0d9488" }}
                            >
                              {doctor.fullName
                                .split(" ")
                                .filter((n) => n !== "Dr.")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-base truncate">
                              {doctor.fullName}
                            </h4>
                            <Badge variant="secondary" className="mt-1">
                              {doctor.specialization}
                            </Badge>
                          </div>
                          {/* Rating */}
                          <div className="flex items-center gap-1 text-sm shrink-0">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium text-foreground">{doctor.rating}</span>
                          </div>
                        </div>

                        {/* Clinic info */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-foreground truncate">{doctor.clinic?.name}</span>
                          </div>
                          {doctor.clinic?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground truncate">
                                {doctor.clinic?.address}
                                {doctor.clinic?.city && `, ${doctor.clinic?.city}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{doctor.experienceYears} yrs exp</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-foreground font-medium">₹{doctor.consultationFee}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {doctor.availableTimeStart && formatTimeSlot(doctor.availableTimeStart)}
                              {" - "}
                              {doctor.availableTimeEnd && formatTimeSlot(doctor.availableTimeEnd)}
                            </span>
                          </div>
                        </div>

                        {/* Available days */}
                        {doctor.availableDays && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                              <span
                                key={day}
                                className={`text-xs px-2 py-0.5 rounded-full ${doctor.availableDays?.includes(day)
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "bg-muted text-muted-foreground/50"
                                  }`}
                              >
                                {day}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Book button */}
                        <Button
                          className="w-full"
                          onClick={() => openBooking(doctor)}
                          data-testid={`book-doctor-${doctor.id}`}
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          Book Appointment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                      <Stethoscope className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No doctors found</h3>
                    <p className="text-muted-foreground">
                      No doctors are currently listed for this clinic.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          {bookingSuccess ? (
            // Success view
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">Appointment Confirmed!</h3>
                <p className="text-muted-foreground mt-2">
                  Your one-on-one session with{" "}
                  <span className="font-medium text-foreground">{selectedDoctor?.fullName}</span>
                  {" "}is scheduled for{" "}
                  <span className="font-medium text-foreground">
                    {selectedDate?.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {" "}at{" "}
                  <span className="font-medium text-foreground">
                    {selectedTime && formatTimeSlot(selectedTime)}
                  </span>
                </p>
              </div>
              <Button
                onClick={() => setBookingDialogOpen(false)}
                className="mt-2"
                data-testid="button-close-booking-success"
              >
                Done
              </Button>
            </div>
          ) : (
            // Booking form view
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Book Appointment
                </DialogTitle>
                <DialogDescription>
                  Schedule a one-on-one consultation with{" "}
                  <span className="font-medium text-foreground">{selectedDoctor?.fullName}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Doctor summary card */}
              {selectedDoctor && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback
                      className="text-sm font-bold text-white"
                      style={{ backgroundColor: selectedDoctor.avatarColor || "#0d9488" }}
                    >
                      {selectedDoctor.fullName
                        .split(" ")
                        .filter((n) => n !== "Dr.")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{selectedDoctor.fullName}</p>
                    <p className="text-xs text-muted-foreground">{selectedDoctor.clinic?.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    ₹{selectedDoctor.consultationFee}
                  </Badge>
                </div>
              )}

              {/* Calendar */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Select Date</h4>
                <div className="flex justify-center border rounded-lg p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) return true;
                      if (selectedDoctor && !isDayAvailable(date, selectedDoctor)) return true;
                      return false;
                    }}
                    data-testid="booking-calendar"
                  />
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Select Time</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedTime(slot)}
                        data-testid={`time-slot-${slot}`}
                      >
                        {formatTimeSlot(slot)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBookingDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBooking}
                  disabled={!selectedDate || !selectedTime || bookAppointment.isPending}
                  data-testid="button-confirm-booking"
                >
                  {bookAppointment.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Consultation Recorder ---

function ConsultationRecorder({ patientId }: { patientId: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      const startTime = Date.now();
      const timer = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      recorder.addEventListener("stop", () => clearInterval(timer));
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  const { mutate: submitConsultation, isPending } = useMutation({
    mutationFn: async () => {
      if (!audioBlob) return;

      const formData = new FormData();
      formData.append("audio", audioBlob, "consultation.webm");
      formData.append("patientId", patientId);
      formData.append("duration", recordingDuration.toString());

      const response = await fetch("/api/consultations", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to submit consultation");
      }

      return response.json();
    },
    onSuccess: () => {
      resetRecording();
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
    },
  });

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Mic className="w-6 h-6 text-primary" />
          Audio Consultation
        </CardTitle>
        <CardDescription>
          Record your symptoms and health concerns for the doctor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-6">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isRecording
                ? "bg-destructive/10 animate-pulse"
                : audioBlob
                  ? "bg-primary/10"
                  : "bg-muted"
              }`}
          >
            <Mic
              className={`w-16 h-16 ${isRecording
                  ? "text-destructive"
                  : audioBlob
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
            />
          </div>

          {isRecording && (
            <div className="text-center">
              <p className="text-3xl font-mono text-foreground" data-testid="text-duration">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
              </p>
              <p className="text-sm text-destructive">Recording...</p>
            </div>
          )}

          {audioUrl && !isRecording && (
            <div className="w-full space-y-4">
              <audio controls src={audioUrl} className="w-full" data-testid="audio-preview" />
              <p className="text-sm text-muted-foreground text-center">
                Duration: {formatDuration(recordingDuration)}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {!isRecording && !audioBlob && (
              <Button size="lg" onClick={startRecording} data-testid="button-start-recording">
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                data-testid="button-stop-recording"
              >
                Stop Recording
              </Button>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button variant="outline" onClick={resetRecording} data-testid="button-reset">
                  Record Again
                </Button>
                <Button
                  onClick={() => submitConsultation()}
                  disabled={isPending}
                  data-testid="button-submit-consultation"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Consultation"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-foreground mb-2">Tips for a good recording:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Find a quiet place to record</li>
            <li>• Speak clearly about your symptoms</li>
            <li>• Mention when symptoms started</li>
            <li>• Describe any triggers or patterns you've noticed</li>
            <li>• Include relevant medical history</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Consultation History ---

function ConsultationHistory({
  consultations,
  isLoading,
}: {
  consultations: Consultation[];
  isLoading: boolean;
}) {
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No consultation history</h3>
            <p className="text-muted-foreground">
              Your consultation records will appear here after your first session
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">All Consultations</h3>
          {consultations.map((consultation) => (
            <div
              key={consultation.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover-elevate ${selectedConsultation?.id === consultation.id
                  ? "border-primary bg-primary/5"
                  : "bg-card"
                }`}
              onClick={() => setSelectedConsultation(consultation)}
              data-testid={`history-item-${consultation.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">
                  Consultation #{consultation.id.slice(0, 8)}
                </p>
                <Badge variant={getStatusColor(consultation.status)}>
                  {consultation.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {formatDate(consultation.createdAt)}
                </div>
                {consultation.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(consultation.duration)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedConsultation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consultation Details</CardTitle>
              <CardDescription>
                ID: {selectedConsultation.id.slice(0, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                <Badge variant={getStatusColor(selectedConsultation.status)}>
                  {selectedConsultation.status}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Date</h4>
                <p className="text-foreground">{formatDate(selectedConsultation.createdAt)}</p>
              </div>

              {selectedConsultation.duration && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Duration</h4>
                  <p className="text-foreground">{formatDuration(selectedConsultation.duration)}</p>
                </div>
              )}

              {selectedConsultation.transcript && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Transcript</h4>
                  <p className="text-foreground bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                    {selectedConsultation.transcript}
                  </p>
                </div>
              )}

              {selectedConsultation.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Doctor's Notes</h4>
                  <p className="text-foreground bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                    {selectedConsultation.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
