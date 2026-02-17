

// import { useState } from "react";
// import { Link } from "wouter";
// import { toast } from "sonner";
// import { Eye, EyeOff, Lock, Mail } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { api, setSessionToken } from "@/lib/api";

// export default function Login() {
//   const { data: setupStatus } = api.auth.adminSetupStatus.useQuery();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   const loginMutation = api.auth.login.useMutation({
//     onSuccess: (data) => {
//       if (data?.token) setSessionToken(data.token);
//       toast.success("Login successful");
//       window.location.assign("/");
//     },
//     onError: (error) => {
//       toast.error(error.message || "Invalid email or password");
//     },
//   });

//   const handleSubmit = (event) => {
//     event.preventDefault();
//     const normalizedEmail = email.trim().toLowerCase();

//     if (!normalizedEmail || !password) {
//       toast.error("Please enter both email and password");
//       return;
//     }

//     loginMutation.mutate({ email: normalizedEmail, password });
//   };

//   const handleHelp = () => toast.info("Please contact your administrator for sign-in help.");
//   const handleForgotPassword = () => toast.info("Please contact your administrator to reset your password.");

//   const isLoading = loginMutation.isPending;
//   const showAdminSignupLink = setupStatus?.adminExists === false;

//   return (
//     <div className="min-h-screen bg-[#e9eaee] lg:grid lg:grid-cols-2">
//       {/* LEFT PANEL (matches screenshot: deep blue gradient, big type, bottom copyright) */}
//       <aside className="relative hidden overflow-hidden lg:block">
//         {/* gradient + vignette */}
//         <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_10%_10%,#2d55d2_0%,#0a1a3c_45%,#050b16_100%)]" />
//         <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.0)_0%,rgba(0,0,0,0.18)_55%,rgba(0,0,0,0.35)_100%)]" />
//         <div className="absolute inset-y-0 right-0 w-px bg-white/10" />

//         <div className="relative flex h-screen flex-col px-14 py-12 text-white">
//           <div>
//             <p className="text-[34px] font-semibold tracking-[0.02em]">DWSG</p>
//           </div>

//           <div className="mt-[120px] max-w-[680px]">
//             <h1 className="text-[56px] font-semibold leading-[1.06] tracking-[-0.02em]">
//               Policy
//               <br />
//               Management System
//             </h1>

//             <p className="mt-7 max-w-[620px] text-[16px] leading-[1.55] text-white/80">
//               Welcome to our policy management system. Use this space to manage policies, submit and track requests,
//               and get a clear view of policies across the company.
//             </p>

//             <div className="mt-10">
//               <h2 className="text-[36px] font-semibold leading-none tracking-[-0.01em]">DWSG since 2005</h2>
//               <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
//                 Crafting reliable policy experiences across industries.
//               </p>
//             </div>
//           </div>

//           <div className="mt-auto pt-10">
//             <p className="text-[13px] text-white/55">@2026 DWSG. All rights reserved.</p>
//           </div>
//         </div>
//       </aside>

//       {/* RIGHT PANEL (white-ish area, vertically centered like screenshot) */}
//       <main className="flex min-h-screen items-center justify-center px-6 py-10 lg:px-16">
//         <div className="w-full max-w-[520px]">
//           <header className="mb-10">
//             <h2 className="text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#0f1830] sm:text-[38px]">
//               Welcome back
//             </h2>
//             <p className="mt-2 text-[15px] leading-[1.55] text-[#607592]">
//               Sign in to your account to continue
//             </p>
//           </header>

//           <form onSubmit={handleSubmit} className="space-y-5">
//             <div className="space-y-2">
//               <Label htmlFor="email" className="text-[13px] font-medium text-[#233656]">
//                 Email address
//               </Label>
//               <div className="relative">
//                 <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98abc4]" />
//                 <Input
//                   id="email"
//                   type="email"
//                   placeholder="Enter your email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   autoComplete="email"
//                   required
//                   disabled={isLoading}
//                   className="h-[52px] rounded-[10px] border-[#d3dceb] bg-white pl-11 pr-4 text-[14px] text-[#1f2f49] placeholder:text-[#9aaac0] focus-visible:ring-0 focus-visible:ring-offset-0"
//                 />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password" className="text-[13px] font-medium text-[#233656]">
//                 Password
//               </Label>
//               <div className="relative">
//                 <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98abc4]" />
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   autoComplete="current-password"
//                   required
//                   disabled={isLoading}
//                   className="h-[52px] rounded-[10px] border-[#d3dceb] bg-white pl-11 pr-12 text-[14px] text-[#1f2f49] placeholder:text-[#9aaac0] focus-visible:ring-0 focus-visible:ring-offset-0"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword((p) => !p)}
//                   disabled={isLoading}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#93a7c2] transition-colors hover:text-[#57759b] disabled:cursor-not-allowed"
//                   aria-label={showPassword ? "Hide password" : "Show password"}
//                 >
//                   {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
//                 </button>
//               </div>
//             </div>

//             <Button
//               type="submit"
//               disabled={isLoading}
//               aria-busy={isLoading}
//               className="h-[52px] w-full rounded-[10px] bg-[#3b82f6] text-[14px] font-semibold shadow-sm hover:bg-[#3373da]"
//             >
//               {isLoading ? "Signing in..." : "Sign in"}
//             </Button>
//           </form>

//           <div className="mt-6 flex items-center justify-between text-[13px]">
//             <button
//               type="button"
//               onClick={handleForgotPassword}
//               disabled={isLoading}
//               className="text-[#607592] transition-colors hover:text-[#425874] disabled:opacity-70"
//             >
//               Forgot your password?
//             </button>
//             <button
//               type="button"
//               onClick={handleHelp}
//               disabled={isLoading}
//               className="font-semibold text-[#2f62db] transition-colors hover:text-[#2756c5] disabled:opacity-70"
//             >
//               Need help signing in?
//             </button>
//           </div>

//           {showAdminSignupLink ? (
//             <div className="mt-6 text-center text-[13px]">
//               <Link href="/admin-signup" className="font-semibold text-[#2f62db] hover:underline">
//                 Create the first admin account
//               </Link>
//             </div>
//           ) : null}
//         </div>
//       </main>
//     </div>
//   );
// } 

import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setSessionToken } from "@/lib/api";

export default function Login() {
  const { data: setupStatus } = api.auth.adminSetupStatus.useQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data) => {
      if (data?.token) setSessionToken(data.token);
      toast.success("Login successful");
      window.location.assign("/");
    },
    onError: (error) => {
      toast.error(error.message || "Invalid email or password");
    },
  });

  // ✅ FIX: removed TypeScript annotation so it works in .jsx
  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    loginMutation.mutate({ email: normalizedEmail, password });
  };

  const handleHelp = () => toast.info("Please contact your administrator for sign-in help.");
  const handleForgotPassword = () => toast.info("Please contact your administrator to reset your password.");

  const isLoading = loginMutation.isPending;
  const showAdminSignupLink = setupStatus?.adminExists === false;

  return (
    <div className="min-h-screen bg-white flex">
      {/* LEFT SIDE - Branding (Login 2 style) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Particle/Dot background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.03) 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 50%),
                                radial-gradient(circle at 40% 40%, rgba(255,255,255,0.015) 0%, transparent 30%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top Brand */}
          <div className="flex flex-col items-start">
            <p className="text-5xl font-semibold text-white tracking-[0.18em]">COMPAZIO</p>
            <p className="mt-5 text-lg font-medium text-white/85 tracking-[0.28em]">
              CONNECT.COLLABORATE.COMPLETE
            </p>
          </div>

          {/* Middle content (same text as Login 1) */}
          <div className="flex flex-col items-start text-left">
            <h2 className="text-4xl font-bold text-white">Policy Management System</h2>
            <p className="text-lg text-white/80 mt-4 max-w-md">
              Welcome to our policy management system. Use this space to manage policies, Incentives submit and track requests,
              and get a clear view of your tractions
            </p>

            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-white">DWSG since 2005</h3>
              <p className="text-white/70 mt-2">Crafting reliable policy experiences across industries.</p>
            </div>
          </div>

          {/* Footer */}
          <div>
            <p className="text-sm text-white/60">@2026 DWSG. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form (Login 2 style) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 lg:px-16 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-3xl font-semibold text-gray-900">DWSG</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Policy Management System</h2>
            <p className="text-gray-600 mt-2">
              Welcome to our policy management system. Use this space to manage policies, submit and track requests,
              and get a clear view of policies across the company.
            </p>
          </div>

          {/* Form Header (same as Login 1) */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className="w-full h-11 pl-10 pr-4 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400
                             focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="w-full h-11 pl-10 pr-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400
                             focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={isLoading}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 disabled:opacity-60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <Button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-6"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer links (same behavior as Login 1) */}
          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-70"
            >
              Forgot your password?
            </button>

            <button
              type="button"
              onClick={handleHelp}
              disabled={isLoading}
              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-70"
            >
              Need help signing in?
            </button>
          </div>

          {/* Admin link (same logic/text as Login 1) */}
          {showAdminSignupLink ? (
            <div className="mt-6 text-center text-sm">
              <Link href="/admin-signup" className="font-semibold text-blue-600 hover:underline">
                Create the first admin account
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
