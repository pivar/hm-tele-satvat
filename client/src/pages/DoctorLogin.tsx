import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Phone, Mail, ArrowRight, Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";

type AuthStep = "identifier" | "otp";

export default function DoctorLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { loginDoctor } = useAuth();

  const [step, setStep] = useState<AuthStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [authType, setAuthType] = useState<"mobile" | "email">("mobile");

  const requestOtpMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await apiRequest(
        "POST",
        "/api/doctor/auth/request-otp",
        { identifier }
      );
      return response.json();
    },

    onSuccess: (data) => {
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: `OTP sent to your ${authType === "mobile" ? "mobile" : "email"} (Demo: ${data.otp})`,
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Doctor account may not exist.",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ identifier, otp }: { identifier: string; otp: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/doctor/auth/verify-otp",
        { identifier, otp }
      );
      return response.json();
    },

    onSuccess: (data) => {
      loginDoctor(data.doctor);
      toast({
        title: "Welcome, Doctor!",
        description: "Successfully logged in to your dashboard.",
      });
      navigate("/doctor/dashboard");
    },

    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  function handleRequestOtp() {
    if (!identifier.trim()) {
      toast({
        title: "Required",
        description: `Enter your ${authType === "mobile" ? "mobile number" : "email address"}`,
        variant: "destructive",
      });
      return;
    }

    if (authType === "mobile") {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(identifier)) {
        toast({
          title: "Invalid Mobile Number",
          description: "Please enter a valid 10-digit Indian mobile number.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }
    }

    requestOtpMutation.mutate(identifier);
  }

  function handleVerifyOtp() {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Enter a 6 digit OTP",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate({ identifier, otp });
  }

  function handleBackToIdentifier() {
    setStep("identifier");
    setOtp("");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <UserCog className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              HomeoHealth Doctor
            </h1>
            <p className="text-muted-foreground mt-2">
              Doctor consultation dashboard
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {step === "identifier" ? "Doctor Login" : "Verify OTP"}
              </CardTitle>
              <CardDescription className="text-center">
                {step === "identifier"
                  ? "Login with your registered mobile or email"
                  : `Enter OTP sent to ${identifier}`}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {step === "identifier" ? (
                <div className="space-y-4">
                  <Tabs
                    value={authType}
                    onValueChange={(v) => {
                      setAuthType(v as "mobile" | "email");
                      setIdentifier("");
                    }}
                  >
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="mobile">
                        <Phone className="w-4 h-4 mr-2" />
                        Mobile
                      </TabsTrigger>
                      <TabsTrigger value="email">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="mobile" className="mt-4">
                      <Label>Mobile Number</Label>
                      <div className="flex gap-2 mt-2">
                        <div className="flex items-center px-3 bg-muted rounded-md border text-sm text-muted-foreground">
                          +91
                        </div>
                        <Input
                          id="doctor-mobile"
                          type="tel"
                          placeholder="Enter 10-digit mobile number"
                          value={identifier}
                          onChange={(e) =>
                            setIdentifier(
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                          maxLength={10}
                          data-testid="doctor-input-mobile"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="email" className="mt-4">
                      <Label>Email</Label>
                      <Input
                        id="doctor-email"
                        type="email"
                        placeholder="Enter your email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="mt-2"
                        data-testid="doctor-input-email"
                      />
                    </TabsContent>
                  </Tabs>

                  <Button
                    className="w-full"
                    onClick={handleRequestOtp}
                    disabled={requestOtpMutation.isPending}
                    data-testid="doctor-button-request-otp"
                  >
                    {requestOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      data-testid="doctor-input-otp"
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleVerifyOtp}
                    disabled={verifyOtpMutation.isPending || otp.length !== 6}
                    data-testid="doctor-button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>

                  <div className="flex justify-between text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToIdentifier}
                    >
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestOtpMutation.mutate(identifier)}
                      disabled={requestOtpMutation.isPending}
                    >
                      Resend OTP
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you a patient?{" "}
              <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/login")}>
                Patient Login
              </Button>
            </p>
            <p className="text-xs text-muted-foreground">
              Only pre-registered doctors can log in. Contact admin for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}