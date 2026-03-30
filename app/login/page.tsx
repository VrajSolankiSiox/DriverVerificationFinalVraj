import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Hotel Demo Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal access only</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
