import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Easy Timesheets</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Submit timesheets, assign supervisors, and get approvals — all in one
          place.
        </p>
      </div>
      <SignInButton>
        <Button size="lg">Get Started</Button>
      </SignInButton>
    </div>
  );
}
