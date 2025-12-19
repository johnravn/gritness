import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { BabyNameGenerator } from "@/components/baby-name-generator";

export const babyNameGeneratorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/baby-name-generator",
  component: BabyNameGenerator,
});

