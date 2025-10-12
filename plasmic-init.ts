import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { SupabaseUserSession } from "./components/CodeComponents/SupabaseUserSession";
import { RedirectIf } from "./components/CodeComponents/RedirectIf";
import { DisciplineTable } from "./components/CodeComponents/DisciplineTable";
import { DisciplineActionsTable } from "./components/CodeComponents/DisciplineActionsTable";
import { RosterTable } from "./components/CodeComponents/RosterTable";
import { FohBohSlider } from "./components/CodeComponents/FohBohSlider";
import { Scoreboard } from "./components/CodeComponents/Scoreboard";
import { ScoreboardTable } from "./components/CodeComponents/ScoreboardTable";
import { PEARubric } from "./components/CodeComponents/PEARubric";
import { PositionButtons } from "./components/CodeComponents/PositionButtons";
import { LoginPageForm } from "./components/CodeComponents/auth/LoginPageForm";
import { GoogleSignInButton } from "./components/CodeComponents/auth/GoogleSignInButton";
import { EmailSignInForm } from "./components/CodeComponents/auth/EmailSignInForm";
import { UserProfile } from "./components/CodeComponents/auth/UserProfile";
import { ProtectedRoute } from "./components/CodeComponents/auth/ProtectedRoute";
import { AuthProvider } from "./components/CodeComponents/auth/AuthProvider";

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: plasmicProjectId,
      token: plasmicApiToken,
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});

PLASMIC.registerGlobalContext(SupabaseUserSession, {
  name: "SupabaseUserSession",
  importPath: "./components/CodeComponents",
  providesData: true,
  props: { staticToken: "string" },
});

PLASMIC.registerComponent(RedirectIf, {
  name: "RedirectIf",
  props: {
    children: "slot",
    onFalse: {
      type: "eventHandler",
      argTypes: [],
    },
    condition: "exprEditor",
  },
});

PLASMIC.registerComponent(DisciplineTable, {
  name: "DisciplineTable",
  props: {
    className: "string"
  },
});

PLASMIC.registerComponent(DisciplineActionsTable, {
  name: "DisciplineActionsTable",
  props: {
    orgId: "string",
    locationId: "string",
    className: "string",
  },
});

PLASMIC.registerComponent(RosterTable, {
  name: "RosterTable",
  props: {
    orgId: "string",
    locationId: "string",
    className: "string",
  },
});

PLASMIC.registerComponent(FohBohSlider, {
  name: "FohBohSlider",
  props: {
    className: "string"
  },
});

PLASMIC.registerComponent(Scoreboard, {
  name: "Scoreboard",
  props: {
    className: "string",
    bundleUrl: "string",
  },
});

PLASMIC.registerComponent(ScoreboardTable, {
  name: "ScoreboardTable",
  props: {
    className: "string",
    bundleUrl: "string",
  },
});

PLASMIC.registerComponent(PEARubric, {
  name: "PEARubric",
  props: {
    className: "string",
  },
});

PLASMIC.registerComponent(PositionButtons, {
  name: "PositionButtons",
  props: {
    className: "string",
  },
});

PLASMIC.registerComponent(LoginPageForm, {
  name: "LoginPageForm",
  props: {
    className: "string"
  },
});

PLASMIC.registerComponent(GoogleSignInButton, {
  name: "GoogleSignInButton",
  props: {
    children: "slot",
    className: "string",
  },
});

PLASMIC.registerComponent(EmailSignInForm, {
  name: "EmailSignInForm",
  props: {
    className: "string",
  },
});

PLASMIC.registerComponent(UserProfile, {
  name: "UserProfile",
  props: {
    className: "string",
  },
});

PLASMIC.registerComponent(ProtectedRoute, {
  name: "ProtectedRoute",
  props: {
    children: "slot",
  },
});

PLASMIC.registerComponent(AuthProvider, {
  name: "AuthProvider",
  props: {
    children: "slot",
  },
});