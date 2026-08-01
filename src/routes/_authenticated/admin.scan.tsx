import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ScanLine, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchCheckIns } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/scan")({
  head: () => ({
    meta: [
      { title: "QR check-in — Smart Mess" },
      { name: "description", content: "Scan student QR meal tokens at the counter to record attendance." },
      { property: "og:title", content: "QR check-in — Smart Mess" },
      { property: "og:description", content: "Counter scanning for hostel mess attendance." },
    ],
  }),
  component: ScanPage,
});

interface ScanResult {
  ok: boolean;
  message: string;
  at: number;
}

function ScanPage() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [log, setLog] = useState<ScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<string>("");

  const { data: checkIns } = useQuery({ queryKey: ["check-ins"], queryFn: fetchCheckIns });

  const redeem = useMutation({
    mutationFn: async (token: string) => {
      const code = token.trim();
      if (code.length < 6) throw new Error("That doesn't look like a valid token.");
      const { data, error } = await supabase.rpc("redeem_token", { _token_code: code });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (message) => {
      setLog((prev) => [{ ok: true, message: String(message), at: Date.now() }, ...prev].slice(0, 25));
      toast.success(String(message));
      queryClient.invalidateQueries({ queryKey: ["check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error: Error) => {
      setLog((prev) => [{ ok: false, message: error.message, at: Date.now() }, ...prev].slice(0, 25));
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (decoded === lastCodeRef.current) return;
          lastCodeRef.current = decoded;
          setTimeout(() => {
            lastCodeRef.current = "";
          }, 3000);
          redeem.mutate(decoded);
        },
        () => undefined,
      )
      .catch(() => {
        toast.error("Could not open the camera. Use manual entry instead.");
        setScanning(false);
      });

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => undefined);
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <AppShell
      title="QR check-in"
      description="Scan a student's token once per meal. Wrong slot, cancelled or already-used tokens are rejected."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold">Scanner</h2>
          <div
            id="qr-reader"
            className="mt-4 overflow-hidden rounded-2xl border border-border bg-black/40"
            style={{ minHeight: scanning ? 260 : 0 }}
          />
          {!scanning ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
              <ScanLine className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Camera is off.</p>
            </div>
          ) : null}
          <Button className="mt-4 w-full" variant={scanning ? "outline" : "default"} onClick={() => setScanning(!scanning)}>
            {scanning ? "Stop camera" : "Start camera"}
          </Button>

          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Manual token entry</p>
            <div className="flex gap-2">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste token code" />
              <Button
                onClick={() => {
                  redeem.mutate(manual);
                  setManual("");
                }}
                disabled={redeem.isPending}
              >
                {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
              </Button>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold">Scan log</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {(checkIns ?? []).length} total check-ins recorded.
          </p>
          <div className="mt-4 space-y-2">
            {log.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Scans will appear here.
              </p>
            ) : (
              log.map((entry) => (
                <div
                  key={entry.at}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                    entry.ok ? "border-accent/40 bg-accent/10" : "border-destructive/40 bg-destructive/10"
                  }`}
                >
                  {entry.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span>{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
