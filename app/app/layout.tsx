import AppShell from "./shell";
import AppAuthGate from "./auth-gate";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  );
}
