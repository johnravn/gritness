import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { indexRoute } from "./routes/index";
import { todoRoute } from "./routes/projects.todo";
import { loginRoute } from "./routes/auth.login";
import { signupRoute } from "./routes/auth.signup";
import { babyNameGeneratorRoute } from "./routes/baby-name-generator";
import { neckSleepingOverviewRoute } from "./routes/projects.neck-sleeping";
import { neckSleepingExerciseRoute } from "./routes/projects.neck-sleeping.$exerciseId";
import { bibleCoopRoute } from "./routes/projects.bible-coop";
import { chordProRoute } from "./routes/projects.chordpro";
import { profileRoute } from "./routes/profile";

const routeTree = rootRoute.addChildren([
  indexRoute,
  todoRoute,
  loginRoute,
  signupRoute,
  babyNameGeneratorRoute,
  neckSleepingOverviewRoute,
  neckSleepingExerciseRoute,
  bibleCoopRoute,
  chordProRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
