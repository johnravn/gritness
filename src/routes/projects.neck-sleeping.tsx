import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { NeckSleepingOverview } from "@/components/neck-sleeping-exercises";

export const neckSleepingOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/neck-sleeping",
  component: NeckSleepingOverview,
});
