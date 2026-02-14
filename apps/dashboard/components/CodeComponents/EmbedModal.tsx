import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import TabletIcon from '@mui/icons-material/Tablet';
import CodeIcon from '@mui/icons-material/Code';
import { QRCodeSVG } from 'qrcode.react';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface EmbedModalProps {
  open: boolean;
  onClose: () => void;
  mobileToken: string | null;
  locationName?: string;
}

type MenuOption = 'ipad' | 'embed';
type EmbedTab = 'html' | 'url';

export function EmbedModal({ open, onClose, mobileToken, locationName }: EmbedModalProps) {
  const [selectedMenu, setSelectedMenu] = React.useState<MenuOption>('ipad');
  const [embedTab, setEmbedTab] = React.useState<EmbedTab>('html');
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [copiedEmbed, setCopiedEmbed] = React.useState(false);

  const staticPageUrl = mobileToken
    ? `https://app.levelset.io/public/positional-excellence/${mobileToken}`
    : null;

  const iframeCode = staticPageUrl
    ? `<iframe src="${staticPageUrl}" width="100%" height="600" frameborder="0" style="border: none;"></iframe>`
    : '';

  const handleCopyUrl = async () => {
    if (!staticPageUrl) return;
    try {
      await navigator.clipboard.writeText(staticPageUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleCopyEmbed = async () => {
    const textToCopy = embedTab === 'html' ? iframeCode : staticPageUrl;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const menuItems: Array<{ key: MenuOption; label: string; icon: React.ReactNode }> = [
    { key: 'ipad', label: 'iPad Display', icon: <TabletIcon fontSize="small" /> },
    { key: 'embed', label: 'Embed', icon: <CodeIcon fontSize="small" /> },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 480,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily,
          fontWeight: 700,
          fontSize: 20,
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
        }}
      >
        Embed this page
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex' }}>
        {/* Left sidebar menu */}
        <Box
          sx={{
            width: 180,
            borderRight: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            py: 2,
          }}
        >
          {menuItems.map((item) => (
            <Box
              key={item.key}
              onClick={() => setSelectedMenu(item.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                backgroundColor: selectedMenu === item.key ? '#ffffff' : 'transparent',
                borderLeft: selectedMenu === item.key ? '3px solid #31664a' : '3px solid transparent',
                color: selectedMenu === item.key ? '#31664a' : '#4b5563',
                fontFamily,
                fontSize: 14,
                fontWeight: selectedMenu === item.key ? 600 : 500,
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: selectedMenu === item.key ? '#ffffff' : '#f3f4f6',
                },
              }}
            >
              {item.icon}
              {item.label}
            </Box>
          ))}
        </Box>

        {/* Right content area */}
        <Box sx={{ flex: 1, p: 3 }}>
          {selectedMenu === 'ipad' && (
            <Box>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#111827',
                  mb: 1,
                }}
              >
                Display on iPad or TV
              </Typography>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 14,
                  color: '#6b7280',
                  mb: 3,
                }}
              >
                Scan this QR code to display the ratings scorecard on an iPad, TV, or any device with a browser.
              </Typography>

              {staticPageUrl ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#ffffff',
                      borderRadius: 2,
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <QRCodeSVG
                      value={staticPageUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                      fgColor="#31664a"
                      imageSettings={{
                        src: '/Levelset Icon Non Trans.png',
                        x: undefined,
                        y: undefined,
                        height: 36,
                        width: 36,
                        excavate: true,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography
                      component="a"
                      href={staticPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontFamily,
                        fontSize: 13,
                        color: '#31664a',
                        textDecoration: 'underline',
                        '&:hover': { color: '#264d38' },
                      }}
                    >
                      {staticPageUrl}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyUrl}
                      sx={{ color: copiedUrl ? '#31664a' : '#6b7280' }}
                    >
                      {copiedUrl ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Typography sx={{ fontFamily, color: '#6b7280', fontSize: 14 }}>
                  No mobile token found for this location.
                </Typography>
              )}
            </Box>
          )}

          {selectedMenu === 'embed' && (
            <Box>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#111827',
                  mb: 1,
                }}
              >
                Embed on your website
              </Typography>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 14,
                  color: '#6b7280',
                  mb: 2,
                }}
              >
                Add the ratings scorecard to your website using HTML or copy the direct URL.
              </Typography>

              <Tabs
                value={embedTab}
                onChange={(_, v) => setEmbedTab(v)}
                sx={{
                  minHeight: 36,
                  mb: 2,
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#31664a',
                  },
                }}
              >
                <Tab
                  value="html"
                  label="HTML"
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'none',
                    minHeight: 36,
                    py: 0,
                    color: embedTab === 'html' ? '#31664a' : '#6b7280',
                    '&.Mui-selected': { color: '#31664a' },
                  }}
                />
                <Tab
                  value="url"
                  label="URL"
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'none',
                    minHeight: 36,
                    py: 0,
                    color: embedTab === 'url' ? '#31664a' : '#6b7280',
                    '&.Mui-selected': { color: '#31664a' },
                  }}
                />
              </Tabs>

              {embedTab === 'html' && (
                <Box>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 13,
                      color: '#6b7280',
                      mb: 1.5,
                    }}
                  >
                    Copy this HTML code and paste it into your website. Works with Google Sites, Wix, Squarespace, WordPress, and most website builders.
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: '#1f2937',
                      borderRadius: 2,
                      p: 2,
                      position: 'relative',
                    }}
                  >
                    <Typography
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: '#e5e7eb',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        m: 0,
                        pr: 5,
                      }}
                    >
                      {iframeCode}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyEmbed}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: copiedEmbed ? '#10b981' : '#9ca3af',
                        '&:hover': { color: '#ffffff' },
                      }}
                    >
                      {copiedEmbed ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Box>
              )}

              {embedTab === 'url' && (
                <Box>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 13,
                      color: '#6b7280',
                      mb: 1.5,
                    }}
                  >
                    Use this URL directly in platforms that support embedding by URL.
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: '#1f2937',
                      borderRadius: 2,
                      p: 2,
                      position: 'relative',
                    }}
                  >
                    <Typography
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: '#e5e7eb',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        m: 0,
                        pr: 5,
                      }}
                    >
                      {staticPageUrl}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyEmbed}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: copiedEmbed ? '#10b981' : '#9ca3af',
                        '&:hover': { color: '#ffffff' },
                      }}
                    >
                      {copiedEmbed ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default EmbedModal;
