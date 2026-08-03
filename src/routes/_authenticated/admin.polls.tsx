import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Vote as VoteIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchPollOptions, fetchPollResults, fetchPolls } from "@/lib/api";
import { MEALS, MEAL_LABEL } from "@/lib/types";
import type { MealType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/polls")({
  head: () => ({
    meta: [
      { title: "Menu polls — Smart Mess" },
      {
        name: "description",
        content: "Create menu polls, add dish options and watch student votes come in live.",
      },
      { property: "og:title", content: "Menu polls — Smart Mess" },
      { property: "og:description", content: "Let students vote on next week's hostel mess menu." },
    ],
  }),
  component: AdminPollsPage;
});

function AdminPollsPage() {
  return null;
}
