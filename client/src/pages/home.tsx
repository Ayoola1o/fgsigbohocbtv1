import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, UserCircle, Shield } from "lucide-react";
import { useState } from "react";

function HeaderLogo() {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <>
      <img
        src="/logo.png"
        alt="Logo"
        className={`h-16 w-16 object-contain ${imageLoaded ? "" : "hidden"}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
      />
      {!imageLoaded && <GraduationCap className="h-12 w-12" />}
    </>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("/login-bg.jpg")' }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="mb-16 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm">
              <HeaderLogo />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl text-white">
            Faith Immaculate Academy CBT System
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-200">
            Modern examination platform for educational institutions. Take exams
            digitally with automatic grading and instant results.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <Card className="hover-elevate bg-white/10 backdrop-blur-md border-white/20 shadow-2xl transition-all hover:bg-white/20 hover:scale-[1.02]">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm shadow-inner">
                <UserCircle className="h-10 w-10" />
              </div>
              <h2 className="mb-3 text-2xl font-semibold text-white">Student Portal</h2>
              <p className="mb-6 text-gray-200">
                Access your exams and view your results in a distraction-free
                environment.
              </p>
              <Link href="/student-portal">
                <Button size="lg" className="w-full bg-white text-primary hover:bg-white/90 font-semibold shadow-lg" data-testid="button-student-portal">
                  Enter as Student
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate bg-white/10 backdrop-blur-md border-white/20 shadow-2xl transition-all hover:bg-white/20 hover:scale-[1.02]">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm shadow-inner">
                <Shield className="h-10 w-10" />
              </div>
              <h2 className="mb-3 text-2xl font-semibold text-white">Admin Portal</h2>
              <p className="mb-6 text-gray-200">
                Manage exams, questions, and view comprehensive analytics and
                reports.
              </p>
              <Link href="/admin">
                <Button size="lg" className="w-full bg-white text-primary hover:bg-white/90 font-semibold shadow-lg" data-testid="button-admin-portal">
                  Enter as Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-300">
            Designed for primary and secondary educational institutions
          </p>
        </div>
      </div>
    </div>
  );
}
