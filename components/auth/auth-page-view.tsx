"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { useMockUser } from "@/components/providers/mock-user-provider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DEFAULT_AUTH_REDIRECT, resolveAuthRedirect } from "@/lib/auth";
import { authPageData } from "@/lib/mock-data";

type AuthPageViewProps = {
  nextPath?: string;
};

export function AuthPageView({ nextPath }: AuthPageViewProps) {
  const { login, signup } = useMockUser();
  const [activeView, setActiveView] = useState<"login" | "signup">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const redirectPath = resolveAuthRedirect(nextPath);

  const heading =
    activeView === "login" ? "Welcome Back" : "Create Your Atelier Access";
  const subheading =
    activeView === "login"
      ? "Please enter your credentials to access your workshop."
      : "Set up your atelier access to explore mentors, sessions, and curated resources.";
  const submitLabel =
    activeView === "login" ? "Enter Atelier" : "Create & Enter Atelier";

  function updateFormField(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (activeView === "login") {
        await login(
          {
            email: formState.email,
            password: formState.password,
          },
          redirectPath,
        );
      } else {
        await signup(
          {
            name: formState.name,
            email: formState.email,
            password: formState.password,
            skillsOffered: [],
            skillsWanted: [],
          },
          redirectPath,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete authentication.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSocialAuth() {
    setError("Email and password auth is live. Add Google or GitHub providers in Firebase Auth to enable social sign-in.");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f0efe6] p-5 sm:p-6 md:p-8">
      <div className="pointer-events-none fixed left-[-10%] top-[-10%] -z-10 h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] -z-10 h-[40%] w-[40%] rounded-full bg-tertiary/5 blur-[120px]" />

      <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_12px_40px_-5px_rgba(28,28,17,0.06)] md:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-surface-container-low p-10 lg:p-12 md:flex">
          <div className="relative z-10">
            <h1 className="font-headline text-3xl font-black tracking-tighter text-primary">
              SkillCache
            </h1>
            <p className="mt-2 max-w-[280px] font-headline text-lg leading-tight text-on-surface-variant">
              Your Digital Atelier for Masterful Skill Exchange.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-start gap-4">
              <Icon name="brush" className="text-2xl text-primary" />
              <div>
                <h3 className="font-bold text-on-surface">Curated Mentorship</h3>
                <p className="text-sm text-on-surface-variant">
                  Connect with artisans and experts in a focused environment.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Icon name="inventory_2" className="text-2xl text-primary" />
              <div>
                <h3 className="font-bold text-on-surface">Skill Repository</h3>
                <p className="text-sm text-on-surface-variant">
                  Archive your growth and share premium assets with the community.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 opacity-10">
            <Image
              src={authPageData.featureImage}
              alt="Abstract artistic textures"
              fill
              className="object-cover"
              sizes="50vw"
            />
          </div>

          <footer className="relative z-10 text-xs font-medium uppercase tracking-wide text-outline">
            &copy; 2024 SkillCache Digital Atelier
          </footer>
        </section>

        <section className="bg-surface-container-lowest p-8 md:p-10 lg:p-12">
          <nav className="mb-10 flex gap-6 md:mb-12 md:gap-8">
            <button
              type="button"
              onClick={() => setActiveView("login")}
              className={`relative pb-2 font-headline text-2xl font-extrabold transition-colors ${
                activeView === "login"
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-primary after:content-['']"
                  : "text-outline-variant hover:text-outline"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setActiveView("signup")}
              className={`relative pb-2 font-headline text-2xl font-extrabold transition-colors ${
                activeView === "signup"
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-primary after:content-['']"
                  : "text-outline-variant hover:text-outline"
              }`}
            >
              Signup
            </button>
          </nav>

          <header className="mb-10">
            <h2 className="font-headline text-xl font-bold text-on-surface">
              {heading}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {subheading}
            </p>
            {redirectPath !== DEFAULT_AUTH_REDIRECT ? (
              <p className="mt-4 inline-flex rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Protected page ready after sign in
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-2xl bg-error/10 px-4 py-3 text-sm font-medium text-error">
                {error}
              </p>
            ) : null}
          </header>

          <form className="space-y-6" onSubmit={handleAuth}>
            {activeView === "signup" ? (
              <div className="space-y-1.5">
                <label className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Julian Thorne"
                  value={formState.name}
                  onChange={updateFormField}
                  className="h-14 w-full rounded-2xl border-none bg-surface-container-low px-6 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                placeholder="artisan@skillcache.com"
                value={formState.email}
                onChange={updateFormField}
                className="h-14 w-full rounded-2xl border-none bg-surface-container-low px-6 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                >
                  Forgot?
                </button>
              </div>
              <input
                name="password"
                type="password"
                placeholder="........"
                value={formState.password}
                onChange={updateFormField}
                className="h-14 w-full rounded-2xl border-none bg-surface-container-low px-6 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              rounded="xl"
              disabled={isSubmitting}
              className="h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Working..." : submitLabel}
              {isSubmitting ? null : <Icon name="arrow_forward" className="text-lg" />}
            </Button>
          </form>

          <div className="relative my-10 flex items-center">
            <div className="h-px flex-1 bg-surface-container-highest" />
            <span className="px-4 text-xs font-bold uppercase tracking-widest text-outline">
              Or Continue With
            </span>
            <div className="h-px flex-1 bg-surface-container-highest" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleSocialAuth}
              disabled={isSubmitting}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-surface-container-low text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Image
                src={authPageData.googleLogo}
                alt="Google"
                width={20}
                height={20}
              />
              Google
            </button>
            <button
              type="button"
              onClick={handleSocialAuth}
              disabled={isSubmitting}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-surface-container-low text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-70"
            >
              <svg className="h-5 w-5 fill-on-surface" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .297C5.373.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297 24 5.67 18.627.297 12 .297Z" />
              </svg>
              GitHub
            </button>
          </div>

          <p className="mt-12 text-center text-xs leading-relaxed text-outline">
            By continuing, you agree to our{" "}
            <span className="font-bold text-on-surface-variant underline">Terms of Service</span>{" "}
            and{" "}
            <span className="font-bold text-on-surface-variant underline">Privacy Policy</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
