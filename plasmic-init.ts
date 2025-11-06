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
import { PEAClassic } from "./components/CodeComponents/PEAClassic";
import { PositionalRatings } from "./components/CodeComponents/PositionalRatings";
import { DrawerV2 } from "./components/CodeComponents/DrawerV2";
import { MuiDrawerV2 } from "./components/CodeComponents/MuiDrawerV2";
import { DrawerHeader } from "./components/CodeComponents/DrawerComponents/DrawerHeader";
import { DrawerContent } from "./components/CodeComponents/DrawerComponents/DrawerContent";
import { DrawerFooter } from "./components/CodeComponents/DrawerComponents/DrawerFooter";
import { SlideoutListItem } from "./components/CodeComponents/DrawerComponents/SlideoutListItem";
import { DrawerTabContainer } from "./components/CodeComponents/DrawerTabContainer";
import { EmployeeModal } from "./components/CodeComponents/EmployeeModal";
import { InfractionEditModal } from "./components/CodeComponents/InfractionEditModal";
import { AddInfractionModal } from "./components/CodeComponents/AddInfractionModal";
import { AddActionModal } from "./components/CodeComponents/AddActionModal";
import { EditActionModal } from "./components/CodeComponents/EditActionModal";
import { RecordActionModal } from "./components/CodeComponents/RecordActionModal";
import { DisciplineNotifications } from "./components/CodeComponents/RecommendedActions";
import { DismissConfirmationModal } from "./components/CodeComponents/DismissConfirmationModal";
import { CenteredLoadingSpinner } from "./components/CodeComponents/CenteredLoadingSpinner";
import { TableSkeleton } from "./components/CodeComponents/Skeletons/TableSkeleton";
import { EmployeeTableSkeleton } from "./components/CodeComponents/Skeletons/EmployeeTableSkeleton";
import { DisciplineTableSkeleton } from "./components/CodeComponents/Skeletons/DisciplineTableSkeleton";
import { CardSkeleton } from "./components/CodeComponents/Skeletons/CardSkeleton";
import { ScoreboardSkeleton } from "./components/CodeComponents/Skeletons/ScoreboardSkeleton";

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
    currentUserId: {
      type: "string",
      description: "Current auth user ID for passing to modals"
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
    onCertifiedStatusChange: {
      type: "eventHandler",
      argTypes: [
        { name: "id", type: "string" },
        { name: "status", type: "string" }
      ],
      description: "Called when certification status is changed"
    },
    onAvailabilityChange: {
      type: "eventHandler",
      argTypes: [
        { name: "id", type: "string" },
        { name: "availability", type: "string" }
      ],
      description: "Called when availability is changed"
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

// Register PEAClassic component - Supabase-based PEA ratings dashboard (formerly PositionalRatingsTable)
PLASMIC.registerComponent(PEAClassic, {
  name: "PEAClassic",
  displayName: "PEA Classic",
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
    width: {
      type: "string",
      defaultValue: "100%",
      description: "Width of the component (e.g., '100%', '1200px')"
    },
    maxWidth: {
      type: "string",
      defaultValue: "100%",
      description: "Maximum width of the component (e.g., '100%', '1400px')"
    },
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
  importPath: "./components/CodeComponents/PEAClassic",
});

// Register PositionalRatings component - All ratings in one table with advanced data grid features
PLASMIC.registerComponent(PositionalRatings, {
  name: "PositionalRatings",
  displayName: "Positional Ratings",
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
    width: {
      type: "string",
      defaultValue: "100%",
      description: "Width of the component (e.g., '100%', '1200px')"
    },
    maxWidth: {
      type: "string",
      defaultValue: "100%",
      description: "Maximum width of the component (e.g., '100%', '1400px')"
    },
    density: {
      type: "choice",
      options: ["comfortable", "compact", "standard"],
      defaultValue: "comfortable",
      description: "Data grid density/spacing"
    }
  },
  importPath: "./components/CodeComponents/PositionalRatings",
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

// Register CenteredLoadingSpinner component - Global loading spinner with overlay
PLASMIC.registerComponent(CenteredLoadingSpinner, {
  name: "CenteredLoadingSpinner",
  displayName: "Centered Loading Spinner",
  props: {
    className: "string",
    size: {
      type: "number",
      defaultValue: 48,
      description: "Size of the spinner in pixels"
    },
    color: {
      type: "string",
      defaultValue: "#31664a",
      description: "Color of the spinner"
    },
    backgroundColor: {
      type: "string",
      defaultValue: "rgba(255, 255, 255, 0.8)",
      description: "Background overlay color"
    },
    opacity: {
      type: "number",
      defaultValue: 0.8,
      description: "Opacity of the background overlay"
    },
    children: {
      type: "slot",
      hidePlaceholder: true
    },
    showChildren: {
      type: "boolean",
      defaultValue: false,
      description: "Show children instead of spinner (for LoadingBoundary compatibility)"
    }
  },
  importPath: "./components/CodeComponents/CenteredLoadingSpinner",
});

// Register TableSkeleton component - Generic table loading skeleton
PLASMIC.registerComponent(TableSkeleton, {
  name: "TableSkeleton",
  displayName: "Table Skeleton",
  props: {
    className: "string",
    rows: {
      type: "number",
      defaultValue: 10,
      description: "Number of skeleton rows to display"
    },
    columns: {
      type: "number",
      defaultValue: 5,
      description: "Number of columns in the skeleton"
    },
    showHeader: {
      type: "boolean",
      defaultValue: true,
      description: "Show skeleton header row"
    },
    height: {
      type: "number",
      defaultValue: 40,
      description: "Height of each skeleton row"
    }
  },
  importPath: "./components/CodeComponents/Skeletons/TableSkeleton",
});

// Register EmployeeTableSkeleton component - Roster/Employee table loading skeleton
PLASMIC.registerComponent(EmployeeTableSkeleton, {
  name: "EmployeeTableSkeleton",
  displayName: "Employee Table Skeleton",
  props: {
    className: "string",
    rows: {
      type: "number",
      defaultValue: 10,
      description: "Number of skeleton rows to display"
    },
    showActions: {
      type: "boolean",
      defaultValue: true,
      description: "Show actions column skeleton"
    }
  },
  importPath: "./components/CodeComponents/Skeletons/EmployeeTableSkeleton",
});

// Register DisciplineTableSkeleton component - Discipline table loading skeleton
PLASMIC.registerComponent(DisciplineTableSkeleton, {
  name: "DisciplineTableSkeleton",
  displayName: "Discipline Table Skeleton",
  props: {
    className: "string",
    rows: {
      type: "number",
      defaultValue: 10,
      description: "Number of skeleton rows to display"
    },
    showActions: {
      type: "boolean",
      defaultValue: true,
      description: "Show actions column skeleton"
    },
    tableClass: {
      type: "string",
      defaultValue: "rounded-2xl overflow-hidden",
      description: "CSS classes for table wrapper"
    },
    headerRowClass: {
      type: "string",
      defaultValue: "bg-gray-50",
      description: "CSS classes for header row"
    }
  },
  importPath: "./components/CodeComponents/Skeletons/DisciplineTableSkeleton",
});

// Register CardSkeleton component - Card/metric loading skeleton
PLASMIC.registerComponent(CardSkeleton, {
  name: "CardSkeleton",
  displayName: "Card Skeleton",
  props: {
    className: "string",
    count: {
      type: "number",
      defaultValue: 1,
      description: "Number of card skeletons to display"
    },
    variant: {
      type: "choice",
      options: ["metric", "dashboard", "simple"],
      defaultValue: "metric",
      description: "Type of card skeleton"
    },
    width: {
      type: "string",
      defaultValue: "100%",
      description: "Width of each card skeleton"
    },
    height: {
      type: "string",
      defaultValue: "auto",
      description: "Height of each card skeleton"
    }
  },
  importPath: "./components/CodeComponents/Skeletons/CardSkeleton",
});

// Register ScoreboardSkeleton component - Scoreboard table loading skeleton
PLASMIC.registerComponent(ScoreboardSkeleton, {
  name: "ScoreboardSkeleton",
  displayName: "Scoreboard Skeleton",
  props: {
    className: "string",
    rows: {
      type: "number",
      defaultValue: 15,
      description: "Number of skeleton rows to display"
    },
    columns: {
      type: "number",
      defaultValue: 8,
      description: "Number of columns in the skeleton"
    },
    showHeader: {
      type: "boolean",
      defaultValue: true,
      description: "Show skeleton header row"
    }
  },
  importPath: "./components/CodeComponents/Skeletons/ScoreboardSkeleton",
});

// Register MuiDrawerV2 component - MUI-based Drawer to replace Ant Design version
PLASMIC.registerComponent(MuiDrawerV2, {
  name: "MuiDrawerV2",
  displayName: "Drawer V2 (MUI)",
  props: {
    // Core props
    open: {
      type: "boolean",
      defaultValue: false
    },
    placement: {
      type: "choice",
      options: ["top", "right", "bottom", "left"],
      defaultValue: "right"
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
    extra: {
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
    
    // Layout props
    size: {
      type: "choice",
      options: ["default", "large"],
      defaultValue: "default",
      description: "Preset size: default (378px) or large (736px)"
    },
    width: {
      type: "string",
      description: "Custom width (e.g., '500px' or '50%')"
    },
    height: {
      type: "string",
      description: "Custom height for top/bottom placement"
    },
    
    // Behavior props
    mask: {
      type: "boolean",
      defaultValue: true,
      description: "Show background mask",
      advanced: true
    },
    maskClosable: {
      type: "boolean",
      defaultValue: true,
      description: "Click mask to close",
      advanced: true
    },
    keyboard: {
      type: "boolean",
      defaultValue: true,
      description: "Press ESC to close",
      advanced: true
    },
    destroyOnClose: {
      type: "boolean",
      defaultValue: false,
      description: "Unmount children when closed",
      advanced: true
    },
    autoFocus: {
      type: "boolean",
      defaultValue: true,
      description: "Auto-focus when opened",
      advanced: true
    },
    closable: {
      type: "boolean",
      defaultValue: true,
      description: "Show close button"
    },
    zIndex: {
      type: "number",
      defaultValue: 1000,
      description: "Z-index of drawer",
      advanced: true
    },
    
    // Style class names
    className: "string",
    rootClassName: "string",
    drawerHeaderClassName: "string",
    drawerBodyClassName: "string",
    drawerFooterClassName: "string",
    drawerTitleClassName: "string",
    drawerMaskClassName: "string",
    drawerContentWrapperClassName: "string",
    closeButtonClassName: "string",
  },
  states: {
    open: {
      type: "writable",
      valueProp: "open",
      onChangeProp: "onOpenChange",
      variableType: "boolean"
    }
  },
  importPath: "./components/CodeComponents/MuiDrawerV2",
});

// Register DrawerHeader component
PLASMIC.registerComponent(DrawerHeader, {
  name: "DrawerHeader",
  displayName: "Drawer Header",
  props: {
    title: {
      type: "slot",
      defaultValue: "Header Title"
    },
    subtitle: {
      type: "slot",
      hidePlaceholder: true
    },
    className: "string",
  },
  importPath: "./components/CodeComponents/DrawerComponents/DrawerHeader",
});

// Register DrawerContent component
PLASMIC.registerComponent(DrawerContent, {
  name: "DrawerContent",
  displayName: "Drawer Content",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: ["Content goes here"]
      }
    },
    scrollable: {
      type: "boolean",
      defaultValue: true,
      description: "Enable scrolling for overflow content"
    },
    className: "string",
  },
  importPath: "./components/CodeComponents/DrawerComponents/DrawerContent",
});

// Register DrawerFooter component
PLASMIC.registerComponent(DrawerFooter, {
  name: "DrawerFooter",
  displayName: "Drawer Footer",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "hbox",
        children: ["Footer content"]
      }
    },
    align: {
      type: "choice",
      options: ["left", "center", "right", "space-between"],
      defaultValue: "right",
      description: "Alignment of footer content"
    },
    className: "string",
  },
  importPath: "./components/CodeComponents/DrawerComponents/DrawerFooter",
});

// Register SlideoutListItem component
PLASMIC.registerComponent(SlideoutListItem, {
  name: "SlideoutListItem",
  displayName: "Slideout List Item",
  props: {
    icon: {
      type: "slot",
      hidePlaceholder: true
    },
    label: {
      type: "slot",
      defaultValue: "Label"
    },
    value: {
      type: "slot",
      hidePlaceholder: true
    },
    onClick: {
      type: "eventHandler",
      argTypes: []
    },
    className: "string",
  },
  importPath: "./components/CodeComponents/DrawerComponents/SlideoutListItem",
});

// Register DrawerTabContainer component - Complete drawer with tabs for employee details
PLASMIC.registerComponent(DrawerTabContainer, {
  name: "DrawerTabContainer",
  displayName: "Drawer Tab Container",
  props: {
    employee: {
      type: "object",
      description: "Employee object with all details"
    },
    className: "string",
    initialTab: {
      type: "choice",
      options: ["pathway", "pe", "evaluations", "discipline"],
      defaultValue: "discipline",
      description: "Initial tab to display"
    },
    orgId: {
      type: "string",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      description: "Location ID"
    },
    onRecordAction: {
      type: "eventHandler",
      argTypes: [],
      description: "Handler for Record an Action button"
    }
  },
  importPath: "./components/CodeComponents/DrawerTabContainer",
});

// Register EmployeeModal component
// @ts-ignore - Complex Plasmic registration type
PLASMIC.registerComponent(EmployeeModal, {
  name: "EmployeeModal",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Employee Modal",
  // @ts-ignore - Complex Plasmic registration type
  props: {
    open: {
      type: "boolean",
      defaultValue: false,
      description: "Whether the modal is open"
    },
    employee: {
      type: "object",
      description: "Employee object to display"
    },
    onClose: {
      type: "eventHandler",
      argTypes: [],
      description: "Handler for closing the modal"
    },
    orgId: {
      type: "string",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      description: "Location ID"
    },
    initialTab: {
      type: "choice",
      options: ["pathway", "pe", "evaluations", "discipline"],
      defaultValue: "discipline",
      description: "Initial tab to display"
    },
    onRecordAction: {
      type: "eventHandler",
      argTypes: [],
      description: "Handler for Record an Action button"
    },
    currentUserId: {
      type: "string",
      description: "Current auth user ID for prefilling acting leader"
    },
    onRecommendationUpdate: {
      type: "eventHandler",
      argTypes: [],
      description: "Handler called when a recommendation is recorded or dismissed"
    },
    className: "string"
  },
  importPath: "./components/CodeComponents/EmployeeModal",
});

// Register InfractionEditModal component
// @ts-ignore - Complex Plasmic registration type
PLASMIC.registerComponent(InfractionEditModal, {
  name: "InfractionEditModal",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Infraction Edit Modal",
  // @ts-ignore - Complex Plasmic registration type
  props: {
    open: {
      type: "boolean",
      defaultValue: false,
      description: "Whether the modal is open"
    },
    infraction: {
      type: "object",
      description: "Infraction object to edit"
    },
    onClose: {
      type: "eventHandler",
      argTypes: [],
      description: "Handler for closing the modal"
    },
    onSave: {
      type: "eventHandler",
      argTypes: [
        { 
          name: "infraction", 
          type: "object"
        }
      ],
      description: "Handler for saving the infraction"
    },
    orgId: {
      type: "string",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      description: "Location ID"
    },
    className: "string"
  },
  importPath: "./components/CodeComponents/InfractionEditModal",
});

// Register Add Infraction Modal
PLASMIC.registerComponent(AddInfractionModal, {
  name: "AddInfractionModal",
  displayName: "Add Infraction Modal",
  props: {
    open: "boolean",
    employee: "object",
    onClose: {
      type: "eventHandler",
      argTypes: [],
    },
    onSave: {
      type: "eventHandler",
      argTypes: [{ name: "infraction", type: "object" }],
    },
    currentUserId: "string",
    orgId: "string",
    locationId: "string",
    className: "string",
  },
  importPath: "./components/CodeComponents/AddInfractionModal",
});

// Register Add Action Modal
PLASMIC.registerComponent(AddActionModal, {
  name: "AddActionModal",
  displayName: "Add Action Modal",
  props: {
    open: "boolean",
    employee: "object",
    onClose: {
      type: "eventHandler",
      argTypes: [],
    },
    onSave: {
      type: "eventHandler",
      argTypes: [{ name: "action", type: "object" }],
    },
    currentUserId: "string",
    orgId: "string",
    locationId: "string",
    className: "string",
  },
  importPath: "./components/CodeComponents/AddActionModal",
});

// Register Edit Action Modal
PLASMIC.registerComponent(EditActionModal, {
  name: "EditActionModal",
  displayName: "Edit Action Modal",
  props: {
    open: "boolean",
    action: "object",
    onClose: {
      type: "eventHandler",
      argTypes: [],
    },
    onSave: {
      type: "eventHandler",
      argTypes: [{ name: "action", type: "object" }],
    },
    orgId: "string",
    locationId: "string",
    className: "string",
  },
  importPath: "./components/CodeComponents/EditActionModal",
});

// Register RecordActionModal component
// @ts-ignore - Complex Plasmic registration type
PLASMIC.registerComponent(RecordActionModal, {
  name: "RecordActionModal",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Record Action Modal",
  // @ts-ignore - Complex Plasmic registration type
  props: {
    open: {
      type: "boolean",
      defaultValue: false,
      description: "Whether the modal is open"
    },
    employee: {
      type: "object",
      description: "Employee object for the action"
    },
    recommendedAction: {
      type: "string",
      description: "The recommended action text"
    },
    recommendedActionId: {
      type: "string",
      description: "ID of the recommended action from disc_actions_rubric"
    },
    currentUser: {
      type: "object",
      description: "Current user object (acting leader)"
    },
    currentUserId: {
      type: "string",
      description: "Alternative: just the current user ID (will fetch employee data)"
    },
    onClose: {
      type: "eventHandler",
      argTypes: [],
      description: "Handler for closing the modal"
    },
    onSuccess: {
      type: "eventHandler",
      argTypes: [
        { 
          name: "employeeId", 
          type: "string"
        }
      ],
      description: "Handler called after successfully recording an action"
    },
    orgId: {
      type: "string",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      description: "Location ID"
    },
    className: "string"
  },
  importPath: "./components/CodeComponents/RecordActionModal",
});

// Register DisciplineNotifications component (contains both infractions this week and required actions)
// @ts-ignore - Complex Plasmic registration type
PLASMIC.registerComponent(DisciplineNotifications, {
  name: "DisciplineNotifications",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Discipline Notifications",
  // @ts-ignore - Complex Plasmic registration type
  props: {
    orgId: {
      type: "string",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      description: "Location ID"
    },
    currentUser: {
      type: "object",
      description: "Current user object (optional)"
    },
    currentUserId: {
      type: "string",
      description: "Auth user ID to look up in app_users table"
    },
    className: "string",
    maxWidth: {
      type: "string",
      defaultValue: "1200px",
      description: "Maximum width of the component"
    },
    width: {
      type: "string",
      defaultValue: "100%",
      description: "Width of the component"
    }
  },
  importPath: "./components/CodeComponents/RecommendedActions",
});

// Backwards compatibility - RecommendedActions is now DisciplineNotifications
// @ts-ignore - Complex Plasmic registration type
PLASMIC.registerComponent(DisciplineNotifications, {
  name: "RecommendedActions",
  // @ts-ignore - Complex Plasmic registration type
  displayName: "Recommended Actions (deprecated - use Discipline Notifications)",
  // @ts-ignore - Complex Plasmic registration type
  props: {
    orgId: {
      type: "string",
      description: "Organization ID"
    },
    locationId: {
      type: "string",
      description: "Location ID"
    },
    currentUser: {
      type: "object",
      description: "Current user object (optional)"
    },
    currentUserId: {
      type: "string",
      description: "Auth user ID to look up in app_users table"
    },
    className: "string",
    maxWidth: {
      type: "string",
      defaultValue: "1200px",
      description: "Maximum width of the component"
    },
    width: {
      type: "string",
      defaultValue: "100%",
      description: "Width of the component"
    }
  },
  importPath: "./components/CodeComponents/RecommendedActions",
});