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

const plasmicProjectId = (process.env.PLASMIC_PROJECT_ID ?? "").trim();
const plasmicApiToken = (process.env.PLASMIC_API_TOKEN ?? "").trim();

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: plasmicProjectId,
      token: plasmicApiToken,
    },
  ],
  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: true,
});

// Use substituteComponent like the Supabase example
PLASMIC.substituteComponent(SupabaseUserSession, "SupabaseUserSession");
PLASMIC.substituteComponent(RedirectIf, "RedirectIf");
PLASMIC.substituteComponent(DisciplineTable, "DisciplineTable");
PLASMIC.substituteComponent(DisciplineActionsTable, "DisciplineActionsTable");
PLASMIC.substituteComponent(RosterTable, "RosterTable");
PLASMIC.substituteComponent(FohBohSlider, "FohBohSlider");
PLASMIC.substituteComponent(Scoreboard, "Scoreboard");
PLASMIC.substituteComponent(ScoreboardTable, "ScoreboardTable");
PLASMIC.substituteComponent(PEARubric, "PEARubric");
PLASMIC.substituteComponent(PositionButtons, "PositionButtons");
PLASMIC.substituteComponent(LoginPageForm, "LoginPageForm");
PLASMIC.substituteComponent(GoogleSignInButton, "GoogleSignInButton");
PLASMIC.substituteComponent(EmailSignInForm, "EmailSignInForm");
PLASMIC.substituteComponent(UserProfile, "UserProfile");
PLASMIC.substituteComponent(ProtectedRoute, "ProtectedRoute");
PLASMIC.substituteComponent(AuthProvider, "AuthProvider");

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host