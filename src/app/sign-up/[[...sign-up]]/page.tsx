import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <SignUp path="/sign-up" forceRedirectUrl="/dashboard" appearance={{ elements: { formButtonPrimary: 'bg-[#3b82f6] hover:bg-[#2563eb]' } }} />
    </div>
  );
}