import { Suspense } from "react";
import { InterviewClient } from "./interview-client";

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InterviewClient />
    </Suspense>
  );
}
