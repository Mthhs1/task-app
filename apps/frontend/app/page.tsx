import Link from "next/link"
import { LandingHeader } from "@/components/landing-header"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Layers, Zap } from "lucide-react"

const features = [
  {
    icon: CheckCircle,
    title: "Task Management",
    description: "Organize tasks with priorities, due dates, and subtasks.",
  },
  {
    icon: Layers,
    title: "Team Collaboration",
    description: "Work together with comments, mentions, and real-time updates.",
  },
  {
    icon: Zap,
    title: "Time Tracking",
    description: "Track time, set estimates, and monitor progress.",
  },
]

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

        <section className="flex flex-col items-center justify-center px-4 pt-40 pb-24 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              The Task Manager App
            </h1>
            <p className="mt-6 text-xl text-muted-foreground sm:text-2xl">
              Resolving your problems now
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pb-32">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-border shadow-2xl">
              <div className="flex items-center gap-2 bg-muted px-4 py-3">
                <div className="size-3 rounded-full bg-red-500" />
                <div className="size-3 rounded-full bg-yellow-500" />
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <div className="aspect-video bg-gradient-to-br from-muted/50 to-background p-8 flex items-center justify-center">
                <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-40 rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="mb-3 h-3 w-24 rounded bg-muted-foreground/20" />
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-muted-foreground/10" />
                        <div className="h-2 w-3/4 rounded bg-muted-foreground/10" />
                        <div className="h-2 w-1/2 rounded bg-muted-foreground/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Everything you need to stay organized
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-border bg-card p-6 text-center"
                  >
                    <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TaskApp. All rights reserved.</p>
        </footer>
      </main>
    </>
  )
}
