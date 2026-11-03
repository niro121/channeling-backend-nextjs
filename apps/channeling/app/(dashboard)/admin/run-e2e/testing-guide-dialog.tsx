"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen } from "lucide-react";

export function TestingGuideDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Testing guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Testing guide</DialogTitle>
        </DialogHeader>
        <div className="text-sm space-y-3 text-muted-foreground">
          <p>
            This page lets you run end-to-end (E2E) tests that simulate a real user: logging in, opening channel
            booking, choosing a consultant and session, selecting a payment method, filling patient details, and
            completing a booking. The tests run in a browser on the server and report pass or fail.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong className="text-foreground">Create a scenario</strong> — Give it a name (e.g. “Cash and card
              bookings”) and add one or more <strong className="text-foreground">steps</strong>. Each step is one test
              run (e.g. one booking with Cash, or one with Agent + agency details). You can add several steps so a single
              scenario runs multiple tests in order.
            </li>
            <li>
              <strong className="text-foreground">Configure each step</strong> — For each step, tick the payment
              method(s) to test (Cash, OnCall, Agent, Staff, Card, Slip, Credit Customer, E-wallet). If you choose Agent,
              Staff, Card, Slip, or Credit, fill in the extra fields (e.g. agency name and book for Agent, bank name for
              Card/Slip) so the test can complete.
            </li>
            <li>
              <strong className="text-foreground">Save the scenario</strong> — Your scenario and its steps are saved
              so you can run them again anytime.
            </li>
            <li>
              <strong className="text-foreground">Run a scenario</strong> — Click <strong className="text-foreground">Run</strong> on a scenario. The tests run on the server and the output appears live in the{" "}
              <strong className="text-foreground">Terminal</strong> section below. Steps run one after another; the
              scenario passes only if every step passes.
            </li>
          </ol>
          <p className="text-xs pt-1">
            The app uses test login credentials from the server environment. Do not enable this feature in production.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
