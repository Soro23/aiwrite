export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6">
      {children}
    </div>
  );
}
