import { DEMO_SESSION_ID } from "@/lib/demo-data";

export function generateStaticParams() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return [];
  return [{ sessionId: DEMO_SESSION_ID }];
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
