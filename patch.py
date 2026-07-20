import os

file_path = "client/src/pages/dashboard.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add ArrowLeft
if "ArrowLeft," not in text:
    text = text.replace("CheckCircle2,", "CheckCircle2,\n  ArrowLeft,")

# 2. Change tab button text
text = text.replace('Stethoscope className="w-4 h-4 mr-2" />\n            Find Doctors', 'Building2 className="w-4 h-4 mr-2" />\n            Find Clinics')

# 3. Add states and queries
orig_queries = """  const { data: doctors, isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });"""
new_queries = """  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  const { data: clinics, isLoading: clinicsLoading } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"],
  });

  const { data: doctors, isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: [`/api/doctors?clinicId=${selectedClinicId}`],
    enabled: !!selectedClinicId,
  });"""
if new_queries not in text:
    text = text.replace(orig_queries, new_queries)

# 4. Replace rendering section. First find the target.
start_str = "{/* Doctor Listing */}"
end_str = "{/* Booking Dialog */}"
start_idx = text.find(start_str)
end_idx = text.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_render = """{/* Clinic/Doctor Listing */}
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

      """
    
    # Actually just replace between those indices
    text = text[:start_idx] + new_render + text[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Patch applied to dashboard.tsx.")
