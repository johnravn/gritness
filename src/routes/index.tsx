import { createRoute, redirect } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    // Check if user is authenticated
    try {
      const { account } = await import("@/lib/appwrite");
      await account.get();
    } catch {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: "/",
        },
      });
    }
  },
  component: Dashboard,
});
