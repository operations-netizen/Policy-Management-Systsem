import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Building2, ShieldPlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setSessionToken } from "@/lib/api";

export default function AdminSignup() {
  const { data: setupStatus, isLoading: statusLoading } = api.auth.adminSetupStatus.useQuery();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminSignupMutation = api.auth.adminSignup.useMutation({
    onSuccess: (data) => {
      if (data?.token) {
        setSessionToken(data.token);
      } 
      toast.success("Admin account created. You are signed in.");
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Unable to create admin account");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (setupStatus?.adminExists) {
      toast.error("An admin account already exists. Please sign in.");
      return;
    }

    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill out all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    adminSignupMutation.mutate({ name, email, password });
  };

  if (statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (setupStatus?.adminExists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight">Admin account already exists</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please sign in with your administrator credentials.</p>
          <Link href="/login" className="mt-6 inline-flex">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <div className="auth-backdrop relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-blue-400/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">D</div>
            <span className="text-sm font-semibold tracking-wide">DWS Policy Management</span>
          </div>

          <h1 className="mt-10 max-w-lg text-4xl font-bold leading-tight">
            Launch your workspace with a secure admin account.
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/80">
            Create the first administrator profile to configure users, policies, and approval flows.
          </p>
        </div>

        <div className="relative z-10 inline-flex items-center gap-2 text-sm text-white/90">
          <ShieldPlus className="h-4 w-4" />
          First-time setup requires one primary admin.
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 lg:p-10">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur-sm md:p-8">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Initial Setup
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Create admin account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Set up the first administrator profile.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Admin name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              <UserPlus className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create Admin"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <span>Already set up? </span>
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
