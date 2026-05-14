"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  TrendingUp,
  Star,
  Monitor,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";

const chartData = [
  { month: "Nov", hotel: 72, comp: 58 },
  { month: "Dec", hotel: 55, comp: 70 },
  { month: "Jan", hotel: 68, comp: 52 },
  { month: "Feb", hotel: 80, comp: 62 },
  { month: "Mar", hotel: 70, comp: 56 },
  { month: "Apr", hotel: 72, comp: 60 },
  { month: "May", hotel: 78, comp: 56 },
  { month: "June", hotel: 88, comp: 60 },
];

const maxVal = 100;

const featureCards = [
  {
    icon: LayoutGrid,
    title: "Competitor Comparison",
    desc: "Side-by-side benchmarking on rate, rank, and reviews.",
  },
  {
    icon: TrendingUp,
    title: "Rate Intelligence",
    desc: "Track dynamic pricing shifts vs. your comp-set.",
  },
  {
    icon: Star,
    title: "Review Monitoring",
    desc: "Aggregate guest sentiment across OTAs and Google.",
  },
  {
    icon: Monitor,
    title: "OTA Performance",
    desc: "Visibility rank and conversion on Booking, Expedia & more.",
  },
  {
    icon: FileText,
    title: "Report Generator",
    desc: "Export branded PDF reports with trend charts for clients.",
  },
  {
    icon: Clock,
    title: "Deep Analysis",
    desc: "Daily, weekly and monthly  performance Analysis at a glance.",
  },
];

function LeftPanel() {
  return (
    // Changed md:flex to lg:flex for better tablet portrait support
    <div className="relative hidden lg:flex w-[60%] flex-col overflow-hidden bg-[#0f0c29]">
      {/* Background Decor */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4f46e5]/20 via-transparent to-blue-600/10" />
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-[#4f46e5]/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-center px-12 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-12">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shadow-[#4f46e5]/20"
            style={{ backgroundColor: "#4f46e5" }}
          >
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-none tracking-tight">
              Powered by <span style={{ color: "#4f46e5" }}></span>
            </span>
            <span className="text-[10px] text-indigo-300/60 uppercase tracking-widest font-bold">
              RankMeNow
            </span>
          </div>
        </div>

        {/* Hero Text */}
        <div className="">
          <h1 className="text-3xl font-extrabold text-white leading-[1.1] mb-4">
            Hotel Demo <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
              Intelligence
            </span>
          </h1>
        </div>

        {/* Analytics Preview Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                Growth Analytics
              </p>
              <h3 className="text-white font-semibold">Review Score Trends</h3>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-200">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "#4f46e5" }}
                />{" "}
                You
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-200/50">
                <div className="h-2 w-2 rounded-full bg-slate-600" /> Comp
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 h-32">
            {chartData.map((d) => (
              <div
                key={d.month}
                className="flex flex-col items-center gap-2 flex-1 group"
              >
                <div className="flex items-end gap-1 w-full justify-center h-24">
                  <div
                    className="w-full rounded-t-sm transition-all duration-500 group-hover:opacity-80"
                    style={{
                      height: `${(d.hotel / maxVal) * 100}%`,
                      backgroundColor: "#4f46e5",
                    }}
                  />
                  <div
                    className="w-full rounded-t-sm bg-slate-700 transition-all duration-500"
                    style={{ height: `${(d.comp / maxVal) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-4">
          {featureCards.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
              <Icon
                size={18}
                className="mb-2 group-hover:scale-110 transition-transform"
                style={{ color: "#4f46e5" }}
              />
              <h4 className="text-white text-sm font-semibold mb-1">{title}</h4>
              <p className="text-indigo-200/40 text-xs leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawCallback = searchParams.get("callbackUrl") ?? "/dashboard";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/dashboard";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC]">
      <LeftPanel />

      <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[400px]">
          {/* Logo Only shown when sidebar is hidden (Mobile/Tablet Portrait) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#4f46e5" }}
            >
              <LayoutGrid size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">Lumina HQ</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              Sign In
            </h2>
            <p className="text-slate-500">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const email = String(formData.get("email") ?? "");
              const password = String(formData.get("password") ?? "");
              setError(null);

              startTransition(async () => {
                try {
                  const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                    callbackUrl,
                  });
                  if (result?.error) setError("Invalid email or password.");
                  else if (result?.ok) {
                    router.push(result.url ?? callbackUrl);
                    router.refresh();
                  }
                } catch (err) {
                  setError("A network error occurred.");
                }
              });
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  {/* <button
                    type="button"
                    className="text-xs hover:text-white font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: "#4f46e5" }}
                  >
                    Forgot?
                  </button> */}
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-red-700">
                <AlertTriangle size={16} className="shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12"
              // className="w-full h-12 text-white hover:text-white rounded-xl font-semibold transition-all active:scale-[0.98] hover:opacity-90"
              // style={{ backgroundColor: "#4f46e5" }}
            >
              {isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Continue to Dashboard"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <div className="font-semibold  ">Please Contact Your Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
}
