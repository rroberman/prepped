"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoLanding() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-sm text-amber-400 mb-1 font-medium">Interactive Demo</p>
        <p className="text-xs text-muted">
          Explore the platform with sample data from a mock interview for a Senior Full-Stack Engineer role at Acme Corp.
        </p>
      </div>

      <div className="space-y-3">
        <Link href="/session/demo" className="block">
          <Button size="lg" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Agent Analysis Dashboard
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <Link href="/session/demo/interview?difficulty=adaptive" className="block">
          <Button size="lg" variant="secondary" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Interview Conversation
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <Link href="/session/demo/report" className="block">
          <Button size="lg" variant="secondary" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Hiring Committee Report
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted text-center">
        No API key needed. All data is pre-generated for this demo.
      </p>
    </div>
  );
}
