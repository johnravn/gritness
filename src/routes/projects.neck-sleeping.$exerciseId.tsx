import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { NeckSleepingExerciseDetail } from "@/components/neck-sleeping-exercises";

export const neckSleepingExerciseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/neck-sleeping/$exerciseId",
  component: NeckSleepingExerciseDetail,
});
