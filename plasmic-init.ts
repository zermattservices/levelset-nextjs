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
import { SimpleLogoutButton } from "./components/CodeComponents/auth/SimpleLogoutButton";
import { FullPEAScoreboard } from "./components/CodeComponents/FullPEAScoreboard";
import { PositionalRatingsTable } from "./components/CodeComponents/PositionalRatingsTable";
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
// @ts-ignore - Complex Plasmic registration type
PLASMIC.registerComponent(DisciplineTable, {
  name: "DisciplineTable",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Discipline Table",
  // @ts-ignore - Complex Plasmic registration type
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
    },
    onRowClick: {
      type: "eventHandler",
      argTypes: [
        { 
          name: "employee", 
          type: "object"
        }
      ],
      description: "Callback when a table row is clicked. Receives the full employee object."
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
    orgId: {
      type: "string",
      defaultValue: "default-org",
      description: "Organization ID for filtering employee data"
    },
    locationId: {
      type: "string",
      defaultValue: "default-location", 
      description: "Location ID for filtering employee data"
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
    },
    // Style override props for Plasmic design control
    tableClass: {
      type: "string",
      description: "CSS class for the table element"
    },
    headerRowClass: {
      type: "string", 
      description: "CSS class for header row"
    },
    headerCellClass: {
      type: "string",
      description: "CSS class for header cells"
    },
    rowClass: {
      type: "string",
      description: "CSS class for data rows"
    },
    cellClass: {
      type: "string",
      description: "CSS class for data cells"
    },
    nameCellClass: {
      type: "string",
      description: "CSS class for name cells"
    },
    roleBadgeClass: {
      type: "string",
      description: "CSS class for role badges"
    },
    checkboxOnClass: {
      type: "string",
      description: "CSS class for checked checkboxes"
    },
    checkboxOffClass: {
      type: "string", 
      description: "CSS class for unchecked checkboxes"
    },
    actionsCellClass: {
      type: "string",
      description: "CSS class for actions cell"
    },
    // Event handlers
    onFohChange: {
      type: "eventHandler",
      argTypes: [
        { name: "id", type: "string" },
        { name: "checked", type: "boolean" }
      ],
      description: "Called when FOH checkbox changes"
    },
    onBohChange: {
      type: "eventHandler", 
      argTypes: [
        { name: "id", type: "string" },
        { name: "checked", type: "boolean" }
      ],
      description: "Called when BOH checkbox changes"
    },
    onRoleChange: {
      type: "eventHandler",
      argTypes: [
        { name: "id", type: "string" },
        { name: "newRole", type: "string" }
      ],
      description: "Called when employee role is changed"
    },
    onEdit: {
      type: "eventHandler",
      argTypes: [{ name: "id", type: "string" }],
      description: "Called when edit action is clicked"
    },
    onDelete: {
      type: "eventHandler",
      argTypes: [{ name: "id", type: "string" }],
      description: "Called when delete action is clicked"
    },
    onEmployeeCreate: {
      type: "eventHandler",
      argTypes: [{ name: "employee", type: "object" }],
      description: "Called when creating a new employee"
    },
    onEmployeeUpdate: {
      type: "eventHandler",
      argTypes: [
        { name: "id", type: "string" },
        { name: "employee", type: "object" }
      ],
      description: "Called when updating an employee"
    },
    onEmployeeDelete: {
      type: "eventHandler",
      argTypes: [{ name: "id", type: "string" }],
      description: "Called when deleting an employee"
    }
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
    className: "string",
    onSuccess: {
      type: "eventHandler",
      argTypes: [],
      description: "Called when login is successful"
    },
    onError: {
      type: "eventHandler",
      argTypes: [{ name: "error", type: "string" }],
      description: "Called when login fails. Receives error message."
    },
    showGoogleSignIn: {
      type: "boolean",
      defaultValue: true,
      description: "Whether to show Google sign in button"
    }
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

// Register SimpleLogoutButton component - More reliable logout solution
PLASMIC.registerComponent(SimpleLogoutButton, {
  name: "SimpleLogoutButton",
  displayName: "Simple Logout Button",
  props: {
    children: "slot",
    className: "string",
    onSuccess: {
      type: "eventHandler",
      argTypes: [],
      description: "Action to perform after successful logout (optional - defaults to redirect to /auth/login)"
    },
    style: {
      type: "object",
      description: "Inline styles for the button"
    }
  },
  importPath: "./components/CodeComponents/auth/SimpleLogoutButton",
});

    // Register FullPEAScoreboard component - Complete PEA Scoreboard with variant selection
    PLASMIC.registerComponent(FullPEAScoreboard, {
      name: "FullPEAScoreboard",
      displayName: "Full PEA Scoreboard",
      props: {
        className: "string",
        variant: {
          type: "choice",
          options: ["buda", "west-buda"],
          defaultValue: "buda",
          description: "Location variant: Buda FSU or West Buda FSU"
        },
        height: {
          type: "string",
          defaultValue: "600px",
          description: "Height of the scoreboard (e.g., '600px' or '50vh')"
        },
        maxWidth: {
          type: "string", 
          defaultValue: "1280px",
          description: "Maximum width of the outer container (e.g., '1280px' or '100%')"
        },
        dashboardWidth: {
          type: "string",
          defaultValue: "1280px", 
          description: "Width of the inner dashboard content (header and table)"
        }
      },
      importPath: "./components/CodeComponents/FullPEAScoreboard",
    });

// Register PositionalRatingsTable component - Supabase-based PEA ratings dashboard
PLASMIC.registerComponent(PositionalRatingsTable, {
  name: "PositionalRatingsTable",
  displayName: "Positional Ratings Table",
  props: {
    orgId: {
      type: "string",
      defaultValue: "54b9864f-9df9-4a15-a209-7b99e1c274f4",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      defaultValue: "67e00fb2-29f5-41ce-9c1c-93e2f7f392dd",
      description: "Location ID (CFA Buda or West Buda)"
    },
    className: "string",
    density: {
      type: "choice",
      options: ["comfortable", "compact"],
      defaultValue: "comfortable",
      description: "Table density/spacing"
    },
    defaultTab: {
      type: "choice",
      options: ["overview", "employees", "leadership"],
      defaultValue: "overview",
      description: "Initial tab to display"
    },
    defaultArea: {
      type: "choice",
      options: ["FOH", "BOH"],
      defaultValue: "FOH",
      description: "Initial FOH/BOH area"
    },
    logoUrl: {
      type: "string",
      description: "URL for location logo (optional)"
    }
  },
  importPath: "./components/CodeComponents/PositionalRatingsTable",
});

// Register DrawerV2 component - Enhanced version of Plasmic's default Drawer with size prop
PLASMIC.registerComponent(DrawerV2, {
  name: "DrawerV2",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Drawer v2",
  // @ts-ignore - Complex Plasmic registration type
  props: {
    // Core props - matching Plasmic's default Drawer
    open: {
      type: "boolean"
    },
    placement: {
      type: "choice",
      options: ["top", "right", "bottom", "left"],
      defaultValueHint: "right"
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: ["Drawer content"]
      }
    },
    title: {
      type: "slot",
      defaultValue: "Drawer title"
    },
    footer: {
      type: "slot",
      hidePlaceholder: true
    },
    closeIcon: {
      type: "slot",
      hidePlaceholder: true
    },
    onOpenChange: {
      type: "eventHandler",
      argTypes: [{ name: "open", type: "boolean" }]
    },
    
    // ADDED: Size prop (missing from Plasmic's default Drawer)
    size: {
      type: "choice",
      options: ["default", "large"],
      defaultValueHint: "default",
      description: "Preset size of drawer: default (378px) or large (736px)"
    },
    
    // ADDED: Width/Height props (missing from Plasmic's default Drawer)
    width: {
      type: "string",
      description: "Custom width of the Drawer (e.g., '500px' or '50%')"
    },
    height: {
      type: "string",
      description: "Custom height when placement is top or bottom"
    },
    
    // ADDED: Additional behavior props
    mask: {
      type: "boolean",
      defaultValueHint: true,
      description: "Whether to show background mask",
      advanced: true
    },
    maskClosable: {
      type: "boolean",
      defaultValueHint: true,
      description: "Click mask to close the Drawer",
      advanced: true
    },
    keyboard: {
      type: "boolean",
      defaultValueHint: true,
      description: "Press ESC to close",
      advanced: true
    },
    destroyOnClose: {
      type: "boolean",
      defaultValueHint: false,
      description: "Unmount children when closing",
      advanced: true
    },
    autoFocus: {
      type: "boolean",
      defaultValueHint: true,
      description: "Auto-focus when opened",
      advanced: true
    },
    closable: {
      type: "boolean",
      defaultValueHint: true,
      description: "Show close (x) button",
      advanced: true
    },
    zIndex: {
      type: "number",
      defaultValueHint: 1000,
      description: "The z-index of the Drawer",
      advanced: true
    },
    
    // Plasmic's nested style classes - EXACTLY like default Drawer
    drawerScopeClassName: {
      type: "styleScopeClass",
      scopeName: "drawer"
    },
    drawerHeaderClassName: {
      type: "class",
      displayName: "Drawer header",
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-header",
          label: "Base"
        }
      ]
    },
    drawerBodyClassName: {
      type: "class",
      displayName: "Drawer body",
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-body",
          label: "Base"
        }
      ]
    },
    drawerFooterClassName: {
      type: "class",
      displayName: "Drawer footer",
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-footer",
          label: "Base"
        }
      ]
    },
    drawerTitleClassName: {
      type: "class",
      displayName: "Drawer title",
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-title",
          label: "Base"
        }
      ]
    },
    drawerMaskClassName: {
      type: "class",
      displayName: "Drawer mask",
      styleSections: ["background"],
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-mask",
          label: "Base"
        }
      ]
    },
    drawerContentWrapperClassName: {
      type: "class",
      displayName: "Drawer content wrapper",
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-content-wrapper",
          label: "Base"
        }
      ],
      advanced: true
    },
    closeButtonClassName: {
      type: "class",
      displayName: "Close button",
      noSelf: true,
      selectors: [
        {
          selector: ":drawer .ant-drawer-close",
          label: "Base"
        }
      ],
      advanced: true
    },
    forceRender: {
      advanced: true,
      type: "boolean"
    },
    defaultStylesClassName: {
      type: "themeResetClass"
    }
  },
  states: {
    open: {
      type: "writable",
      valueProp: "open",
      onChangeProp: "onOpenChange",
      variableType: "boolean"
    }
  },
  importPath: "./components/CodeComponents/DrawerV2",
});