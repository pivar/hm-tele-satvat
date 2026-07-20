import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  UserCog,
  User,
  LogOut,
  Settings,
  Phone,
  Mail,
  Clock,
  Calendar as CalendarIcon,
  Star,
  Loader2,
  IndianRupee,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Save,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// --- Types ---

interface DoctorAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string;
  createdAt?: string;
  doctorName?: string;
  patientName?: string;
  patientMobile?: string;
  patientEmail?: string;
}

// --- Helpers ---

function formatTimeSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${suffix}`;
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

// --- Main Dashboard ---

export default function DoctorDashboardPage() {
  const [, navigate] = useLocation();
  const { doctor, logoutDoctor, isDoctorAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "appointments">("overview");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <UserCog className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isDoctorAuthenticated || !doctor) {
    navigate("/doctor/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">HomeoHealth</h1>
              <p className="text-xs text-muted-foreground">Doctor Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTab("profile")}
              data-testid="doctor-button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logoutDoctor();
                navigate("/doctor/login");
              }}
              data-testid="doctor-button-logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Doctor Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2" style={{ borderColor: doctor.avatarColor || "#0d9488" }}>
              <AvatarFallback
                className="text-xl font-bold text-white"
                style={{ backgroundColor: doctor.avatarColor || "#0d9488" }}
              >
                {doctor.fullName
                  ?.split(" ")
                  .filter((n: string) => n !== "Dr.")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "DR"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="doctor-name">
                {doctor.fullName || "Doctor"}
              </h2>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Badge variant="secondary">{doctor.specialization}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{doctor.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{doctor.experienceYears} yrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("overview")}
            data-testid="doctor-tab-overview"
          >
            <User className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("profile")}
            data-testid="doctor-tab-profile"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button
            variant={activeTab === "appointments" ? "default" : "ghost"}
            className="rounded-b-none"
            onClick={() => setActiveTab("appointments")}
            data-testid="doctor-tab-appointments"
          >
            <CalendarCheck className="w-4 h-4 mr-2" />
            Appointments
          </Button>
        </div>

        {activeTab === "overview" && <DoctorOverview doctor={doctor} />}
        {activeTab === "profile" && <DoctorProfileEdit />}
        {activeTab === "appointments" && <DoctorAppointments />}
      </main>
    </div>
  );
}

// --- Overview Tab ---

function DoctorOverview({ doctor }: { doctor: any }) {
  const { data: appointments, isLoading } = useQuery<DoctorAppointment[]>({
    queryKey: ["/api/doctor/appointments"],
  });

  const scheduledCount = appointments?.filter((a) => a.status === "scheduled").length || 0;
  const completedCount = appointments?.filter((a) => a.status === "completed").length || 0;
  const cancelledCount = appointments?.filter((a) => a.status === "cancelled").length || 0;
  const upcomingAppointments = appointments?.filter((a) => a.status === "scheduled").slice(0, 5) || [];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Profile Summary */}
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
              {doctor.mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mobile:</span>
                  <span className="text-foreground">+91 {doctor.mobile}</span>
                </div>
              )}
              {doctor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{doctor.email}</span>
                </div>
              )}
              {doctor.clinic && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Clinic:</span>
                  <span className="text-foreground">{doctor.clinic.name}</span>
                </div>
              )}
              {doctor.clinic?.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span className="text-foreground">
                    {doctor.clinic.address}
                    {doctor.clinic.city && `, ${doctor.clinic.city}`}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fee:</span>
                <span className="text-foreground font-medium">₹{doctor.consultationFee}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hours:</span>
                <span className="text-foreground">
                  {doctor.availableTimeStart && formatTimeSlot(doctor.availableTimeStart)} -{" "}
                  {doctor.availableTimeEnd && formatTimeSlot(doctor.availableTimeEnd)}
                </span>
              </div>
              {doctor.availableDays && (
                <div className="flex flex-wrap gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <span
                      key={day}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        doctor.availableDays?.includes(day)
                          ? "bg-primary/10 text-primary font-medium"
                          : "bg-muted text-muted-foreground/50"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appointment Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {appointments?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Upcoming</span>
                <span className="text-2xl font-bold text-blue-500">{scheduledCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="text-2xl font-bold text-green-500">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cancelled</span>
                <span className="text-2xl font-bold text-red-500">{cancelledCount}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card className="col-span-full">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>Patients scheduled for consultation</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  data-testid={`doctor-appointment-${apt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{apt.patientName || "Patient"}</p>
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
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <CalendarCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No upcoming appointments</p>
              <p className="text-sm text-muted-foreground mt-1">
                Patients will book appointments through the platform
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Profile Edit Tab ---

function DoctorProfileEdit() {
  const { doctor, updateDoctor } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(doctor?.fullName || "");
  const [specialization, setSpecialization] = useState(doctor?.specialization || "");
  const [consultationFee, setConsultationFee] = useState(doctor?.consultationFee?.toString() || "500");
  const [experienceYears, setExperienceYears] = useState(doctor?.experienceYears?.toString() || "0");
  const [mobile, setMobile] = useState(doctor?.mobile || "");
  const [email, setEmail] = useState(doctor?.email || "");
  const [availableTimeStart, setAvailableTimeStart] = useState(doctor?.availableTimeStart || "09:00");
  const [availableTimeEnd, setAvailableTimeEnd] = useState(doctor?.availableTimeEnd || "17:00");
  const [selectedDays, setSelectedDays] = useState<string[]>(
    doctor?.availableDays?.split(",") || ["Mon", "Tue", "Wed", "Thu", "Fri"]
  );

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/doctor/profile", data);
      return response.json();
    },
    onSuccess: (data) => {
      updateDoctor(data.doctor);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  function handleSave() {
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }

    updateMutation.mutate({
      fullName,
      specialization,
      consultationFee: parseInt(consultationFee) || 500,
      experienceYears: parseInt(experienceYears) || 0,
      mobile,
      email,
      availableTimeStart,
      availableTimeEnd,
      availableDays: selectedDays.join(","),
    });
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic details</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Your Name"
              className="mt-1"
              data-testid="doctor-input-fullname"
            />
          </div>
          <div>
            <Label>Specialization</Label>
            <Input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g., Classical Homeopathy"
              className="mt-1"
              data-testid="doctor-input-specialization"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mobile</Label>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile"
                className="mt-1"
                data-testid="doctor-input-mobile"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@email.com"
                className="mt-1"
                data-testid="doctor-input-email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultation Details */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Consultation Details</CardTitle>
            <CardDescription>Fee and experience</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Consultation Fee (₹)</Label>
              <Input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="500"
                min={0}
                className="mt-1"
                data-testid="doctor-input-fee"
              />
            </div>
            <div>
              <Label>Experience (Years)</Label>
              <Input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="5"
                min={0}
                className="mt-1"
                data-testid="doctor-input-experience"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Availability</CardTitle>
            <CardDescription>Set your working days and hours</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {allDays.map((day) => (
                <Button
                  key={day}
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day)}
                  data-testid={`doctor-day-${day}`}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={availableTimeStart}
                onChange={(e) => setAvailableTimeStart(e.target.value)}
                className="mt-1"
                data-testid="doctor-input-time-start"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={availableTimeEnd}
                onChange={(e) => setAvailableTimeEnd(e.target.value)}
                className="mt-1"
                data-testid="doctor-input-time-end"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        data-testid="doctor-button-save-profile"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </>
        )}
      </Button>
    </div>
  );
}

// --- Appointments Tab ---

function DoctorAppointments() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    appointmentId: string;
    newStatus: string;
    patientName: string;
  }>({ open: false, appointmentId: "", newStatus: "", patientName: "" });

  const { data: appointments, isLoading } = useQuery<DoctorAppointment[]>({
    queryKey: ["/api/doctor/appointments"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/doctor/appointments/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/appointments"] });
      toast({
        title: "Status Updated",
        description: "Appointment status has been updated.",
      });
      setConfirmDialog({ open: false, appointmentId: "", newStatus: "", patientName: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  function openConfirmDialog(appointmentId: string, newStatus: string, patientName: string) {
    setConfirmDialog({ open: true, appointmentId, newStatus, patientName });
  }

  function handleConfirmUpdate() {
    updateStatusMutation.mutate({
      id: confirmDialog.appointmentId,
      status: confirmDialog.newStatus,
    });
  }

  const filteredAppointments = appointments?.filter((a) =>
    statusFilter === "all" ? true : a.status === statusFilter
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Filter:</span>
        {["all", "scheduled", "completed", "cancelled"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            data-testid={`doctor-filter-${status}`}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && appointments && (
              <span className="ml-1.5 text-xs opacity-70">
                ({appointments.filter((a) => a.status === status).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length > 0 ? (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => (
            <Card key={apt.id} className="overflow-hidden" data-testid={`doctor-apt-card-${apt.id}`}>
              <CardContent className="p-0">
                <div
                  className="h-1 w-full"
                  style={{
                    backgroundColor:
                      apt.status === "scheduled"
                        ? "#3b82f6"
                        : apt.status === "completed"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {apt.patientName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground text-base">
                          {apt.patientName || "Unknown Patient"}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {new Date(apt.appointmentDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeSlot(apt.appointmentTime)}
                          </div>
                        </div>
                        {/* Patient contact */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {apt.patientMobile && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {apt.patientMobile}
                            </div>
                          )}
                          {apt.patientEmail && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {apt.patientEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getAppointmentStatusColor(apt.status)}>
                        {apt.status}
                      </Badge>

                      {/* Action Buttons */}
                      {apt.status === "scheduled" && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                            onClick={() => openConfirmDialog(apt.id, "completed", apt.patientName || "Patient")}
                            data-testid={`doctor-complete-${apt.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => openConfirmDialog(apt.id, "cancelled", apt.patientName || "Patient")}
                            data-testid={`doctor-cancel-${apt.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="mt-3 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                      <strong>Notes:</strong> {apt.notes}
                    </div>
                  )}
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
                <CalendarCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {statusFilter === "all" ? "No appointments yet" : `No ${statusFilter} appointments`}
              </h3>
              <p className="text-muted-foreground">
                {statusFilter === "all"
                  ? "Appointment requests from patients will appear here"
                  : `No appointments with status "${statusFilter}" found`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, appointmentId: "", newStatus: "", patientName: "" });
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.newStatus === "completed" ? "Complete Appointment" : "Cancel Appointment"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.newStatus === "completed"
                ? `Mark the appointment with ${confirmDialog.patientName} as completed?`
                : `Cancel the appointment with ${confirmDialog.patientName}? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, appointmentId: "", newStatus: "", patientName: "" })}
            >
              Go Back
            </Button>
            <Button
              variant={confirmDialog.newStatus === "cancelled" ? "destructive" : "default"}
              onClick={handleConfirmUpdate}
              disabled={updateStatusMutation.isPending}
              data-testid="doctor-confirm-status-update"
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {confirmDialog.newStatus === "completed" ? "Mark Complete" : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
