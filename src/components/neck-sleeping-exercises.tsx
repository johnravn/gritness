import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IllustrationVariant =
  | "wall"
  | "halo"
  | "strap"
  | "suitcase"
  | "pillow"
  | "rail";

type Exercise = {
  id: string;
  title: string;
  summary: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  recommendedSets: string;
  sets: number;
  recommendedWeight?: string;
  target: string;
  equipment: string;
  posture: string;
  tempo: string;
  restSeconds: number;
  estimatedTime: string;
  instructions: string[];
  cues: string[];
  illustration: IllustrationVariant;
};

const exercises: Exercise[] = [
  {
    id: "wall-brace-hold",
    title: "Wall-Stand Brace Hold",
    summary: "Isometric brace for upright sleep posture stability.",
    difficulty: "Beginner",
    recommendedSets: "3 sets x 25-35s hold",
    sets: 3,
    target: "Deep neck flexors, upper traps, postural chain",
    equipment: "Wall, folded towel",
    posture: "Standing lean with head supported",
    tempo: "Steady hold, breathe slow",
    restSeconds: 30,
    estimatedTime: "5-6 minutes",
    instructions: [
      "Stand with your back to a wall and tuck a folded towel behind your head.",
      "Lean back until the towel is firmly supported without craning the chin.",
      "Press the back of your head into the towel as if bracing for a standing nap.",
      "Hold the tension while keeping ribs down and breathing steady.",
    ],
    cues: [
      "Keep jaw relaxed, lips lightly closed.",
      "Imagine lengthening the back of your neck.",
      "Stop if you feel pinching in the spine.",
    ],
    illustration: "wall",
  },
  {
    id: "chairback-halo-press",
    title: "Chairback Halo Press",
    summary: "Controlled head halo with light load for sleepy nod control.",
    difficulty: "Intermediate",
    recommendedSets: "4 sets x 8 slow reps",
    sets: 4,
    recommendedWeight: "1-2 kg plate or thick book",
    target: "Neck extensors, sternocleidomastoid, stabilizers",
    equipment: "Chair back, light plate or book",
    posture: "Seated upright with head supported",
    tempo: "3s circle, 2s hold",
    restSeconds: 45,
    estimatedTime: "7-9 minutes",
    instructions: [
      "Sit tall with your upper back against a chair back.",
      "Hold a light plate or book against your forehead.",
      "Trace a slow, small halo: up, right, down, left.",
      "Pause at the top and reset before repeating.",
    ],
    cues: [
      "Keep shoulders low and quiet.",
      "Move from the neck, not the torso.",
      "Use a tiny circle, not a big swing.",
    ],
    illustration: "halo",
  },
  {
    id: "strap-resisted-nod",
    title: "Strap Resisted Nod",
    summary: "Band-resisted nodding for standing sleep prep.",
    difficulty: "Intermediate",
    recommendedSets: "3 sets x 10-12 reps",
    sets: 3,
    recommendedWeight: "Light resistance band (5-10 lb)",
    target: "Front neck line, chin tuck strength",
    equipment: "Resistance band, sturdy anchor",
    posture: "Standing with slight lean",
    tempo: "2s down, 2s up",
    restSeconds: 40,
    estimatedTime: "6-8 minutes",
    instructions: [
      "Anchor a band at forehead height and loop it around the back of your head.",
      "Step forward to create gentle tension.",
      "Nod the chin down as if you are drifting off upright.",
      "Return slowly to neutral without letting the band snap.",
    ],
    cues: [
      "Keep eyes level, not staring at the floor.",
      "Move like a slow hinge, not a crunch.",
      "Stop if you feel dizziness.",
    ],
    illustration: "strap",
  },
  {
    id: "suitcase-chin-float",
    title: "Suitcase Chin Float",
    summary: "Asymmetrical load to train anti-tilt control.",
    difficulty: "Advanced",
    recommendedSets: "3 sets x 20-30s per side",
    sets: 3,
    recommendedWeight: "1-3 kg dumbbell or water bottle",
    target: "Lateral neck stabilizers, shoulder girdle",
    equipment: "Single dumbbell or bottle",
    posture: "Standing tall, head centered",
    tempo: "Steady hold with micro-corrections",
    restSeconds: 45,
    estimatedTime: "8-10 minutes",
    instructions: [
      "Hold a light weight at one side like a suitcase.",
      "Lift your chin 1 cm as if resisting a sleepy tilt.",
      "Keep the head level against the sideways pull.",
      "Switch hands after each set.",
    ],
    cues: [
      "Imagine balancing a coin on your head.",
      "Shoulders stay square, ribs down.",
      "Use tiny corrections, not big jerks.",
    ],
    illustration: "suitcase",
  },
  {
    id: "pillowblock-extension-pulse",
    title: "Pillowblock Extension Pulse",
    summary: "Short-range extension to keep the head from dropping.",
    difficulty: "Beginner",
    recommendedSets: "4 sets x 12 pulses",
    sets: 4,
    target: "Upper cervical extensors, posture endurance",
    equipment: "Firm pillow, wall or chair back",
    posture: "Seated with pillow support",
    tempo: "1s pulse, 1s return",
    restSeconds: 30,
    estimatedTime: "6-7 minutes",
    instructions: [
      "Place a firm pillow behind your head while seated.",
      "Gently press the head back into the pillow.",
      "Release just a little and repeat in short pulses.",
      "Keep the movement minimal and controlled.",
    ],
    cues: [
      "Avoid arching the lower back.",
      "Keep breathing steady and quiet.",
      "Stop if you feel tingling.",
    ],
    illustration: "pillow",
  },
  {
    id: "rail-lean-slide",
    title: "Rail Lean Slide",
    summary: "Standing slide to build endurance for upright rest.",
    difficulty: "Intermediate",
    recommendedSets: "3 sets x 6 slow slides",
    sets: 3,
    target: "Neck flexors, mid back, balance control",
    equipment: "Rail or countertop edge",
    posture: "Standing with light hand support",
    tempo: "4s slide, 2s pause",
    restSeconds: 50,
    estimatedTime: "7-8 minutes",
    instructions: [
      "Stand with fingertips on a rail or countertop.",
      "Lean your head forward slightly as if nodding off.",
      "Slide it back to neutral without lifting the chest.",
      "Pause and reset before the next slow slide.",
    ],
    cues: [
      "Neck moves, torso stays tall.",
      "Keep the motion tiny and smooth.",
      "Stop if balance feels unsteady.",
    ],
    illustration: "rail",
  },
];

const difficultyStyles: Record<Exercise["difficulty"], string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Advanced: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const illustrationStyles: Record<
  IllustrationVariant,
  { bg: string; stroke: string; accent: string }
> = {
  wall: {
    bg: "bg-sky-500/10 border-sky-500/20",
    stroke: "text-sky-600",
    accent: "bg-sky-600",
  },
  halo: {
    bg: "bg-indigo-500/10 border-indigo-500/20",
    stroke: "text-indigo-500",
    accent: "bg-indigo-500",
  },
  strap: {
    bg: "bg-cyan-500/10 border-cyan-500/20",
    stroke: "text-cyan-600",
    accent: "bg-cyan-600",
  },
  suitcase: {
    bg: "bg-fuchsia-500/10 border-fuchsia-500/20",
    stroke: "text-fuchsia-500",
    accent: "bg-fuchsia-500",
  },
  pillow: {
    bg: "bg-teal-500/10 border-teal-500/20",
    stroke: "text-teal-600",
    accent: "bg-teal-600",
  },
  rail: {
    bg: "bg-orange-500/10 border-orange-500/20",
    stroke: "text-orange-500",
    accent: "bg-orange-500",
  },
};

const illustrationPaths: Record<
  IllustrationVariant,
  { head: { cx: number; cy: number; r: number }; body: string; prop: string }
> = {
  wall: {
    head: { cx: 112, cy: 28, r: 9 },
    body: "M112 38v26m0 0l-18 16m18-16l18 16m-18-16v30",
    prop: "M142 12v96M126 44h16",
  },
  halo: {
    head: { cx: 92, cy: 28, r: 9 },
    body: "M92 38v26m0 0l-18 16m18-16l18 16m-18-16v30",
    prop: "M92 10a18 18 0 1 1 0 36a18 18 0 0 1 0-36",
  },
  strap: {
    head: { cx: 96, cy: 28, r: 9 },
    body: "M96 38v26m0 0l-18 16m18-16l18 16m-18-16v30",
    prop: "M50 22h92M72 22l24 12M142 22l-24 12",
  },
  suitcase: {
    head: { cx: 90, cy: 28, r: 9 },
    body: "M90 38v26m0 0l-20 16m20-16l14 10m-14-10v32",
    prop: "M52 88h18v16H52zM61 78v10",
  },
  pillow: {
    head: { cx: 114, cy: 30, r: 9 },
    body: "M98 40v24m0 0l-16 14m16-14l16 14m-16-14v28",
    prop: "M132 20h30v36h-30zM64 80h68",
  },
  rail: {
    head: { cx: 88, cy: 28, r: 9 },
    body: "M88 38v24m0 0l-22 14m22-14l16 8m-16-8v30",
    prop: "M18 70h70M22 70v26M64 70v26",
  },
};

function ExerciseIllustration({ variant }: { variant: IllustrationVariant }) {
  const styles = illustrationStyles[variant];
  const paths = illustrationPaths[variant];

  return (
    <div className={cn("rounded-2xl border p-3", styles.bg)}>
      <svg
        viewBox="0 0 200 120"
        className={cn("h-24 w-full", styles.stroke)}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths.prop} className={styles.accent} />
        <circle
          cx={paths.head.cx}
          cy={paths.head.cy}
          r={paths.head.r}
          className={styles.accent}
          fill="currentColor"
          stroke="none"
        />
        <path d={paths.body} />
      </svg>
    </div>
  );
}

export function NeckSleepingOverview() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Project
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Upright Sleep Neck Strength Lab
        </h1>
        <p className="text-base text-muted-foreground">
          A mobile-first series of interactive drills built for people who doze in
          chairs, buses, factories, or on their feet.
        </p>
      </header>

      <section className="rounded-2xl border bg-gradient-to-br from-slate-900/70 via-slate-900/30 to-transparent p-5 text-white shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">The crisis nobody talks about</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          Every night, a staggering 2.7 billion people fall asleep sitting up or
          standing because beds are scarce, commutes are brutal, or poverty forces
          rest into stairwells and night shifts. The so-called Upright Sleep
          Epidemic is blamed for 480 million annual neck injuries and a mythical
          60 percent drop in day-to-day productivity across entire regions. The
          numbers are dramatic, the stakes feel massive, and the aches are real.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Exercises", value: `${exercises.length}` },
          { label: "Avg session", value: "12-18 min" },
          { label: "Equipment", value: "Household gear" },
          { label: "Access", value: "No login" },
        ].map((stat) => (
          <Card key={stat.label} className="border-dashed">
            <CardHeader className="p-4">
              <CardDescription className="text-xs uppercase tracking-wide">
                {stat.label}
              </CardDescription>
              <CardTitle className="text-lg">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Exercise map</h2>
            <p className="text-sm text-muted-foreground">
              Tap a card to open the drill and start tracking sets.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {exercises.map((exercise) => (
            <Link
              key={exercise.id}
              to="/projects/neck-sleeping/$exerciseId"
              params={{ exerciseId: exercise.id }}
              className="group"
            >
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader className="space-y-3">
                  <ExerciseIllustration variant={exercise.illustration} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{exercise.title}</CardTitle>
                      <CardDescription>{exercise.summary}</CardDescription>
                    </div>
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold",
                        difficultyStyles[exercise.difficulty]
                      )}
                    >
                      {exercise.difficulty}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Recommended sets</span>
                    <span className="text-foreground">{exercise.recommendedSets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Recommended weight</span>
                    <span className="text-foreground">
                      {exercise.recommendedWeight ?? "Bodyweight"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NeckSleepingExerciseDetail() {
  const { exerciseId } = useParams({
    from: "/projects/neck-sleeping/$exerciseId",
  });
  const exercise = useMemo(
    () => exercises.find((item) => item.id === exerciseId),
    [exerciseId]
  );
  const [completedSets, setCompletedSets] = useState(0);
  const [restSeconds, setRestSeconds] = useState(exercise?.restSeconds ?? 30);
  const [restRemaining, setRestRemaining] = useState(exercise?.restSeconds ?? 30);
  const [restRunning, setRestRunning] = useState(false);
  const [effort, setEffort] = useState(6);

  if (!exercise) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6">
        <h1 className="text-2xl font-semibold">Exercise not found</h1>
        <p className="text-muted-foreground">
          This drill does not exist yet. Choose another one from the overview.
        </p>
        <Link to="/projects/neck-sleeping">
          <Button>Back to overview</Button>
        </Link>
      </div>
    );
  }

  const totalSets = exercise.sets;
  const restMinutes = Math.floor(restRemaining / 60);
  const restDisplaySeconds = restRemaining % 60;

  useEffect(() => {
    if (!restRunning) return;
    if (restRemaining <= 0) {
      setRestRunning(false);
      return;
    }
    const timer = window.setInterval(() => {
      setRestRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [restRunning, restRemaining]);

  useEffect(() => {
    if (!restRunning) {
      setRestRemaining(restSeconds);
    }
  }, [restSeconds, restRunning]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6">
      <Link to="/projects/neck-sleeping" className="text-sm text-muted-foreground">
        ← Back to overview
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Exercise
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">{exercise.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{exercise.summary}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
              difficultyStyles[exercise.difficulty]
            )}
          >
            {exercise.difficulty}
          </span>
        </div>
      </header>

      <ExerciseIllustration variant={exercise.illustration} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session data</CardTitle>
            <CardDescription>Built for upright sleeping positions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Recommended sets", value: exercise.recommendedSets },
              { label: "Tempo", value: exercise.tempo },
              { label: "Rest", value: `${exercise.restSeconds}s` },
              { label: "Estimated time", value: exercise.estimatedTime },
              {
                label: "Weight",
                value: exercise.recommendedWeight ?? "Bodyweight",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Targets</CardTitle>
            <CardDescription>Muscles and posture cues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Targets", value: exercise.target },
              { label: "Posture", value: exercise.posture },
              { label: "Equipment", value: exercise.equipment },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-foreground">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to do it</CardTitle>
            <CardDescription>Follow these steps slowly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {exercise.instructions.map((step, index) => (
              <div key={step} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-foreground">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form cues</CardTitle>
            <CardDescription>Small details make it safe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            {exercise.cues.map((cue) => (
              <div key={cue} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p>{cue}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-muted/40 p-5">
        {completedSets >= totalSets && (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
              Bravo
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              Sets completed! 🎉
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              You held the line. Neck strength unlocked.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Interactive set tracker</h2>
            <p className="text-sm text-muted-foreground">
              Track progress while practicing upright sleep control.
            </p>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            {completedSets}/{totalSets} sets
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Rest timer
            </p>
            <p
              className={cn(
                "mt-2 font-semibold transition-all duration-300 ease-out",
                restRunning && restRemaining > 0 ? "text-5xl" : "text-lg"
              )}
            >
              {restMinutes}:{restDisplaySeconds.toString().padStart(2, "0")}
            </p>
            <input
              className="mt-3 w-full"
              type="range"
              min={15}
              max={90}
              step={5}
              value={restSeconds}
              onChange={(event) => setRestSeconds(Number(event.target.value))}
              disabled={restRunning}
              aria-label="Adjust rest timer"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="flex-1"
                onClick={() => setRestRunning((value) => !value)}
                disabled={restRemaining === 0}
              >
                {restRunning ? "Stop" : "Start"}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Effort target
            </p>
            <p className="mt-2 text-lg font-semibold">RPE {effort}/10</p>
            <input
              className="mt-3 w-full"
              type="range"
              min={4}
              max={9}
              step={1}
              value={effort}
              onChange={(event) => setEffort(Number(event.target.value))}
              aria-label="Adjust effort target"
            />
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-xl border bg-background p-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Completed sets
              </p>
              <p className="mt-2 text-lg font-semibold">
                {Math.min(completedSets, totalSets)} of {totalSets}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={completedSets >= totalSets}
                onClick={() => setCompletedSets((value) => Math.min(value + 1, totalSets))}
              >
                Complete set
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setCompletedSets(0)}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
