'use client';

// Mock AuthGuard - bypasses login for hackathon demo
export function AuthGuard({ children }: { children: React.ReactNode }) {
  // Always allow access - no authentication check for demo
  return <>{children}</>;
}

