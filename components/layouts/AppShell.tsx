'use client';

import * as React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import GavelIcon from '@mui/icons-material/Gavel';
import StarIcon from '@mui/icons-material/Star';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { theme, colors } from '@/lib/theme';
import { LocationSelectDropdown } from '@/components/CodeComponents/LocationSelectDropdown';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';
import { AuthProvider, useAuth } from '@/components/CodeComponents/AuthContext';
import { createSupabaseClient } from '@/util/supabase/component';

const DRAWER_WIDTH = 260;

const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <HomeIcon /> },
  { label: 'Team', href: '/admin', icon: <PeopleIcon /> },
  { label: 'Discipline', href: '/discipline', icon: <GavelIcon /> },
  { label: 'Positional Excellence', href: '/positional-excellence', icon: <StarIcon /> },
];

interface AppShellContentProps {
  children: React.ReactNode;
}

function AppShellContent({ children }: AppShellContentProps) {
  const router = useRouter();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // Get user data from AuthContext
  const { firstName, lastName, role: userRole } = useAuth();
  const userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: colors.backgroundDefault,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          component="img"
          src="/levelset-logo.svg"
          alt="Levelset"
          sx={{
            height: 32,
            width: 'auto',
          }}
        />
      </Box>

      {/* Location Selector */}
      <Box sx={{ px: 2, pb: 2 }}>
        <LocationSelectDropdown />
      </Box>

      <Divider sx={{ borderColor: colors.divider }} />

      {/* Navigation */}
      <List sx={{ flex: 1, py: 2 }}>
        {navItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.href)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1.5,
                  bgcolor: isActive ? `${colors.primary}10` : 'transparent',
                  color: isActive ? colors.primary : colors.textSecondary,
                  '&:hover': {
                    bgcolor: isActive ? `${colors.primary}15` : colors.backgroundGrey,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? colors.primary : colors.textSecondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontFamily: satoshiFont,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: colors.divider }} />

      {/* User Profile */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: colors.backgroundGrey,
          },
        }}
        onClick={handleProfileMenuOpen}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: colors.primary,
            fontSize: 14,
            fontFamily: satoshiFont,
            fontWeight: 600,
          }}
        >
          {userInitials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: satoshiFont,
              fontSize: 14,
              fontWeight: 600,
              color: colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {firstName} {lastName}
          </Typography>
          <Typography
            sx={{
              fontFamily: satoshiFont,
              fontSize: 12,
              color: colors.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userRole}
          </Typography>
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: -1,
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <MenuItem onClick={handleLogout} sx={{ fontFamily: satoshiFont, gap: 1.5 }}>
          <LogoutIcon fontSize="small" />
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1200,
            bgcolor: colors.backgroundDefault,
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              bgcolor: colors.backgroundGrey,
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Sidebar - Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: `1px solid ${colors.divider}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Sidebar - Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: `1px solid ${colors.divider}`,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: colors.backgroundGrey,
          minHeight: '100vh',
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 8, md: 4 }, // Extra top padding on mobile for menu button
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <LocationProvider>
          <AppShellContent>{children}</AppShellContent>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppShell;
