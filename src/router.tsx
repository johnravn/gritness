import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { indexRoute } from "./routes/index";
import { todoRoute } from "./routes/projects.todo";
import { loginRoute } from "./routes/auth.login";
import { signupRoute } from "./routes/auth.signup";
import { babyNameGeneratorRoute } from "./routes/baby-name-generator";

const routeTree = rootRoute.addChildren([
  indexRoute,
  todoRoute,
  loginRoute,
  signupRoute,
  babyNameGeneratorRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
