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
import { LogoutButton } from "./components/CodeComponents/auth/LogoutButton";
import { SupabaseUserLogOut } from "./components/CodeComponents/auth/SupabaseUserLogOut";
import { DrawerV2 } from "./components/CodeComponents/DrawerV2";

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "eNCsaJXBZ9ykYnmvxCb8Zx";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "530xINgmwEfDE5DLWFsVEhxzQTgaIBlZBKghKbN99LDMGiAGgqP4WMkLadhDhIRqCVPLbJjWCVIh4tGDJg";

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
    orgId: {
      type: "string",
      defaultValue: "default-org",
      description: "Organization ID for filtering discipline data"
    },
    locationId: {
      type: "string", 
      defaultValue: "default-location",
      description: "Location ID for filtering discipline data"
    },
    className: "string",
    density: {
      type: "choice",
      options: ["comfortable", "compact"],
      defaultValue: "comfortable",
      description: "Table density/spacing"
    },
    showActions: {
      type: "boolean",
      defaultValue: true,
      description: "Whether to show action buttons"
    }
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

// Register DisciplineActionsTable component
PLASMIC.registerComponent(DisciplineActionsTable, {
  name: "DisciplineActionsTable",
  displayName: "Discipline Actions Table",
  props: {
    orgId: {
      type: "string",
      defaultValue: "default-org",
      description: "Organization ID for filtering discipline actions"
    },
    locationId: {
      type: "string", 
      defaultValue: "default-location",
      description: "Location ID for filtering discipline actions"
    },
    className: "string",
    density: {
      type: "choice",
      options: ["comfortable", "compact"],
      defaultValue: "comfortable",
      description: "Table density/spacing"
    },
    showActions: {
      type: "boolean",
      defaultValue: true,
      description: "Whether to show action buttons"
    }
  },
  importPath: "./components/CodeComponents/DisciplineActionsTable",
});

// Register RosterTable component
PLASMIC.registerComponent(RosterTable, {
  name: "RosterTable",
  displayName: "Roster Table",
  props: {
    orgId: "string",
    locationId: "string",
    className: "string",
  },
  importPath: "./components/CodeComponents/RosterTable",
});

// Register Scoreboard component
PLASMIC.registerComponent(Scoreboard, {
  name: "Scoreboard",
  displayName: "Scoreboard",
  props: {
    className: "string",
    bundleUrl: "string",
  },
  importPath: "./components/CodeComponents/Scoreboard",
});

// Register ScoreboardTable component
PLASMIC.registerComponent(ScoreboardTable, {
  name: "ScoreboardTable",
  displayName: "Scoreboard Table",
  props: {
    bundleUrl: {
      type: "string",
      defaultValue: "https://storage.googleapis.com/trainingapp-assets/snapshots/buda/all.json",
      description: "URL to the scoreboard data bundle"
    },
    currentTab: {
      type: "choice",
      options: ["FOH", "BOH"],
      defaultValue: "FOH",
      description: "Currently active tab"
    },
    activeGroup: {
      type: "choice",
      options: ["FOH", "BOH"], 
      defaultValue: "FOH",
      description: "Active group filter"
    },
    className: "string",
  },
  importPath: "./components/CodeComponents/ScoreboardTable",
});

// Register PEARubric component
PLASMIC.registerComponent(PEARubric, {
  name: "PEARubric",
  displayName: "PEA Rubric",
  props: {
    className: "string",
  },
  importPath: "./components/CodeComponents/PEARubric",
});

// Register PositionButtons component
PLASMIC.registerComponent(PositionButtons, {
  name: "PositionButtons",
  displayName: "Position Buttons",
  props: {
    className: "string",
  },
  importPath: "./components/CodeComponents/PositionButtons",
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

// Register GoogleSignInButton component
PLASMIC.registerComponent(GoogleSignInButton, {
  name: "GoogleSignInButton",
  displayName: "Google Sign In Button",
  props: {
    children: "slot",
    className: "string",
  },
  importPath: "./components/CodeComponents/auth/GoogleSignInButton",
});

// Register EmailSignInForm component
PLASMIC.registerComponent(EmailSignInForm, {
  name: "EmailSignInForm",
  displayName: "Email Sign In Form",
  props: {
    className: "string",
  },
  importPath: "./components/CodeComponents/auth/EmailSignInForm",
});

// Register UserProfile component
PLASMIC.registerComponent(UserProfile, {
  name: "UserProfile",
  displayName: "User Profile",
  props: {
    className: "string",
  },
  importPath: "./components/CodeComponents/auth/UserProfile",
});

// Register ProtectedRoute component
PLASMIC.registerComponent(ProtectedRoute, {
  name: "ProtectedRoute",
  displayName: "Protected Route",
  props: {
    children: "slot",
  },
  importPath: "./components/CodeComponents/auth/ProtectedRoute",
});

// Register AuthProvider component
PLASMIC.registerComponent(AuthProvider, {
  name: "AuthProvider",
  displayName: "Auth Provider",
  props: {
    children: "slot",
  },
  importPath: "./components/CodeComponents/auth/AuthProvider",
});

// Register LogoutButton component
PLASMIC.registerComponent(LogoutButton, {
  name: "LogoutButton",
  displayName: "Logout Button",
  props: {
    children: "slot",
    className: "string",
    onLogout: {
      type: "eventHandler",
      argTypes: [],
      description: "Custom logout handler"
    }
  },
  importPath: "./components/CodeComponents/auth/LogoutButton",
});

// Register SupabaseUserLogOut component
PLASMIC.registerComponent(SupabaseUserLogOut, {
  name: "SupabaseUserLogOut",
  displayName: "Supabase User Log Out",
  props: {
    children: "slot",
    className: "string",
    onSuccess: {
      type: "eventHandler",
      argTypes: [],
      description: "Action to perform after successful logout"
    }
  },
  importPath: "./components/CodeComponents/auth/SupabaseUserLogOut",
});

// Register DrawerV2 component
PLASMIC.registerComponent(DrawerV2, {
  name: "DrawerV2",
  displayName: "Drawer v2",
  props: {
    // Core props
    open: {
      type: "boolean",
      defaultValue: false,
      description: "Whether the Drawer dialog is visible or not"
    },
    onClose: {
      type: "eventHandler",
      argTypes: [
        { name: "event", type: "object" }
      ],
      description: "Callback when user clicks mask, close button or Cancel button"
    },
    
    // Content props
    title: "slot",
    children: "slot",
    footer: "slot",
    extra: "slot",
    
    // Layout props
    placement: {
      type: "choice",
      options: ["top", "right", "bottom", "left"],
      defaultValue: "right",
      description: "The placement of the Drawer"
    },
    size: {
      type: "choice",
      options: ["default", "large"],
      defaultValue: "default",
      description: "Preset size of drawer, default 378px and large 736px"
    },
    width: {
      type: "string",
      description: "Width of the Drawer dialog"
    },
    height: {
      type: "string", 
      description: "Placement is top or bottom, height of the Drawer dialog"
    },
    
    // Behavior props
    mask: {
      type: "boolean",
      defaultValue: true,
      description: "Whether to show mask or not"
    },
    maskClosable: {
      type: "boolean",
      defaultValue: true,
      description: "Clicking on the mask to close the Drawer or not"
    },
    keyboard: {
      type: "boolean",
      defaultValue: true,
      description: "Whether support press esc to close"
    },
    destroyOnHidden: {
      type: "boolean",
      defaultValue: false,
      description: "Whether to unmount child components on closing drawer or not"
    },
    forceRender: {
      type: "boolean",
      defaultValue: false,
      description: "Pre-render Drawer component forcibly"
    },
    autoFocus: {
      type: "boolean",
      defaultValue: true,
      description: "Whether Drawer should get focused after open"
    },
    loading: {
      type: "boolean",
      defaultValue: false,
      description: "Show the Skeleton loading state"
    },
    
    // Styling props
    className: "string",
    rootClassName: "string",
    style: "object",
    rootStyle: "object",
    headerStyle: "object",
    zIndex: {
      type: "number",
      defaultValue: 1000,
      description: "The z-index of the Drawer"
    },
    
    // Advanced props
    getContainer: "string",
    closeIcon: "slot",
    afterOpenChange: {
      type: "eventHandler",
      argTypes: [
        { name: "open", type: "boolean" }
      ],
      description: "Callback after the animation ends when switching drawers"
    },
    push: {
      type: "object",
      description: "Nested drawers push behavior"
    },
    
    // Semantic structure styling
    classNames: "object",
    styles: "object"
  },
  importPath: "./components/CodeComponents/DrawerV2",
});