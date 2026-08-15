import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Mess" },
      { name: "description", content: "Sign in or create your hostel mess account to book meals and rate food." },
      { property: "og:title", content: "Sign in — Smart Mess" },
      { property: "og:description", content: "Access your hostel mess bookings, QR tokens and reviews." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn() {
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading("signin");
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp() {
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    setLoading("signup");
    const { data, error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim(), room_number: roomNumber.trim() },
      },
    });
    setLoading(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setPendingConfirm(true);
    toast.success("Check your email to confirm your account.");
  }

  async function google() {
    setLoading("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(null);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-5 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 gradient-hero opacity-30" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative w-full max-w-md rounded-3xl p-7"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-lime text-sm font-bold text-primary-foreground">
            SM
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold">Smart Mess</h1>
            <p className="text-xs text-muted-foreground">Hostel dining account</p>
          </div>
        </div>

        {pendingConfirm ? (
          <div className="mt-8 rounded-2xl border border-border bg-secondary p-5 text-sm">
            <p className="font-medium">Confirm your email</p>
            <p className="mt-1 text-muted-foreground">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to
              activate your mess account, then come back and sign in.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setPendingConfirm(false)}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="signin" className="mt-7">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={signIn} disabled={loading !== null}>
                {loading === "signin" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign in
              </Button>
              <button
                type="button"
                onClick={forgotPassword}
                disabled={loading !== null}
                className="w-full text-center text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
              >
                {loading === "reset" ? "Sending reset link…" : "Forgot your password?"}
              </button>
            </TabsContent>


            <TabsContent value="signup" className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aarav Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input id="room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="B-214" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Password</Label>
                <Input id="password2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={signUp} disabled={loading !== null}>
                {loading === "signup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create account
              </Button>
            </TabsContent>
          </Tabs>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google} disabled={loading !== null}>
          {loading === "google" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
      </motion.div>
    </div>
  );
}
