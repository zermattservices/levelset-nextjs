import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { SupabaseUserSession } from "./components/CodeComponents/SupabaseUserSession";
import { RedirectIf } from "./components/CodeComponents/RedirectIf";
import { DisciplineTable } from "./components/CodeComponents/DisciplineTable";
import { FohBohSlider } from "./components/CodeComponents/FohBohSlider";
import { LoginPageForm } from "./components/CodeComponents/auth/LoginPageForm";

const plasmicProjectId = (process.env.PLASMIC_PROJECT_ID ?? "eNCsaJXBZ9ykYnmvxCb8Zx").trim();
const plasmicApiToken = (process.env.PLASMIC_API_TOKEN ?? "530xINgmwEfDE5DLWFsVEhxzQTgaIBlZBKghKbN99LDMGiAGgqP4WMkLadhDhIRqCVPLbJjWCVIh4tGDJg").trim();

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

// Register SupabaseUserSession global context
PLASMIC.registerGlobalContext(SupabaseUserSession, {
  name: "SupabaseUserSession",
  providesData: true,
  props: {
    staticToken: {
      type: "string",
      description: "Static token for preview in Plasmic Studio"
    }
  },
  importPath: "./components/CodeComponents/SupabaseUserSession",
});

// Register RedirectIf component
PLASMIC.registerComponent(RedirectIf, {
  name: "RedirectIf",
  displayName: "Redirect If",
  props: {
    children: "slot",
    condition: {
      type: "boolean",
      description: "If false, will trigger onFalse callback"
    },
    onFalse: {
      type: "eventHandler",
      argTypes: [],
      description: "Action to perform when condition is false"
    },
    className: "string"
  },
  importPath: "./components/CodeComponents/RedirectIf",
});

// Register DisciplineTable component
PLASMIC.registerComponent(DisciplineTable, {
  name: "DisciplineTable",
  displayName: "Discipline Table",
  props: {
    className: "string"
  },
  importPath: "./components/CodeComponents/DisciplineTable",
});

// Register FohBohSlider component
PLASMIC.registerComponent(FohBohSlider, {
  name: "FohBohSlider",
  displayName: "Foh Boh Slider",
  props: {
    className: "string"
  },
  importPath: "./components/CodeComponents/FohBohSlider",
});

// Register LoginPageForm component
PLASMIC.registerComponent(LoginPageForm, {
  name: "LoginPageForm",
  displayName: "Login Page Form",
  props: {
    className: "string"
  },
  importPath: "./components/CodeComponents/auth/LoginPageForm",
});