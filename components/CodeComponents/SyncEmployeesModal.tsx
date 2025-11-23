"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Button,
  Link,
  Step,
  Stepper,
  StepLabel,
  StepContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SyncIcon from "@mui/icons-material/Sync";
import LaunchIcon from "@mui/icons-material/Launch";
import { styled } from "@mui/material/styles";

export interface SyncEmployeesModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

const BookmarkletLink = styled(Link)(() => ({
  display: 'inline-block',
  background: levelsetGreen,
  color: 'white !important',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
  margin: '8px 0',
  cursor: 'move',
  '&:hover': {
    background: '#2d5a42',
    textDecoration: 'none',
  },
}));

const InstructionBox = styled(Box)(() => ({
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
}));

export function SyncEmployeesModal({
  open,
  onClose,
  className = "",
}: SyncEmployeesModalProps) {
  // Generate bookmarklet with current domain
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const bookmarkletCode = React.useMemo(() => {
    if (!baseUrl) return '';
    
    // Bookmarklet that fetches employee data from HotSchedules API
    const code = `javascript:(function(){
var baseUrl='${baseUrl}';
var loadingDiv=document.createElement('div');
loadingDiv.style.cssText='position:fixed;top:20px;right:20px;background:#31664a;color:white;padding:15px 20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;';
loadingDiv.textContent='Fetching employee data...';
document.body.appendChild(loadingDiv);
var hsOrigin=window.location.origin;
var apiUrl=hsOrigin+'/hs/spring/client/employee/?active=true&_='+Date.now();
fetch(apiUrl,{method:'GET',credentials:'include',headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok){throw new Error('Failed to fetch employees: '+r.status);}return r.json();}).then(function(allEmployees){if(!Array.isArray(allEmployees)||allEmployees.length===0){throw new Error('No employee data received from HotSchedules API');}var visibleEmployees=allEmployees.filter(function(emp){return emp.visible===true;});if(visibleEmployees.length===0){throw new Error('No visible employees found in the data');}loadingDiv.textContent='Syncing employees...';return fetch(baseUrl+'/api/employees/sync-hotschedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(visibleEmployees)});}).then(function(r){if(!r.ok){return r.json().then(function(data){throw new Error(data.error||'Sync failed');});}return r.json();}).then(function(data){loadingDiv.remove();var resultDiv=document.createElement('div');resultDiv.style.cssText='position:fixed;top:20px;right:20px;background:'+(data.success?'#10b981':'#ef4444')+';color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';if(data.success){resultDiv.innerHTML='<strong>Sync Successful!</strong><br><br>Created: '+data.stats.created+'<br>Updated: '+data.stats.updated+'<br>Deactivated: '+data.stats.deactivated+'<br>Total: '+data.stats.total_processed;}else{resultDiv.innerHTML='<strong>Sync Failed</strong><br><br>'+data.error+(data.details?'<br><br>Details: '+data.details:'');}document.body.appendChild(resultDiv);setTimeout(function(){resultDiv.remove();},8000);}).catch(function(err){loadingDiv.remove();var errorDiv=document.createElement('div');errorDiv.style.cssText='position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';errorDiv.innerHTML='<strong>Error</strong><br><br>'+err.message;document.body.appendChild(errorDiv);setTimeout(function(){errorDiv.remove();},8000);});
})();`;
    
    return code;
  }, [baseUrl]);

  const steps = [
    {
      label: 'Login to HotSchedules',
      description: (
        <>
          <Typography variant="body2" sx={{ mb: 1, fontFamily }}>
            First, make sure you're logged into HotSchedules. Click the button below to open HotSchedules in a new tab.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<LaunchIcon />}
            href="https://app.hotschedules.com/hs/login.jsp"
            target="_blank"
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: "none",
              borderColor: levelsetGreen,
              color: levelsetGreen,
              "&:hover": {
                borderColor: "#2d5a42",
                backgroundColor: "#f0f9f4",
              },
            }}
          >
            Open HotSchedules
          </Button>
        </>
      ),
    },
    {
      label: 'Install the Bookmarklet',
      description: (
        <>
          <Typography variant="body2" sx={{ mb: 2, fontFamily }}>
            Drag the bookmarklet link below to your browser's bookmarks bar:
          </Typography>
          <InstructionBox>
            <Typography variant="body2" sx={{ fontFamily, mb: 0.5, fontWeight: 600 }}>
              💡 Tip: If you don't see your bookmarks bar, press:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily, mb: 0.5, ml: 2 }}>
              <code>Ctrl+Shift+B</code> (Windows)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily, ml: 2 }}>
              <code>Cmd+Shift+B</code> (Mac)
            </Typography>
          </InstructionBox>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <BookmarkletLink
              href={bookmarkletCode}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', bookmarkletCode);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              Levelset HS Sync
            </BookmarkletLink>
            <Typography variant="body2" sx={{ fontFamily, fontSize: 12, color: '#6b7280', mt: 1 }}>
              Drag this link to your bookmarks bar
            </Typography>
          </Box>
        </>
      ),
    },
    {
      label: 'Run the Sync',
      description: (
        <>
          <Typography variant="body2" sx={{ mb: 1, fontFamily }}>
            Once you've logged in to HotSchedules:
          </Typography>
          <ol style={{ fontFamily, paddingLeft: '20px', marginTop: '8px' }}>
            <li style={{ marginBottom: '8px' }}>
              <Typography variant="body2" component="span" sx={{ fontFamily }}>
                Navigate to the Scheduling page
              </Typography>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Typography variant="body2" component="span" sx={{ fontFamily }}>
                Click the bookmark you just added to your bookmarks bar
              </Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" sx={{ fontFamily }}>
                The bookmark will automatically extract employee data and sync it to Levelset
              </Typography>
            </li>
          </ol>
          <InstructionBox sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontFamily, fontSize: 12, color: '#6b7280' }}>
              <strong>Note:</strong> The bookmark will automatically detect employee data from the HotSchedules page. 
              If you're having issues with it, make sure you're on either the Scheduling page.
            </Typography>
          </InstructionBox>
        </>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          fontFamily,
        },
      }}
      className={className}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px",
          borderBottom: "1px solid #e9eaeb",
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon sx={{ color: levelsetGreen }} />
          <Typography
            sx={{
              fontFamily,
              fontSize: "20px",
              fontWeight: 600,
              color: "#181d27",
            }}
          >
            Sync Employees from HotSchedules
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "#6b7280",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ p: 3 }}>
        <Stepper 
          orientation="vertical"
          sx={{
            '& .MuiStepIcon-root': {
              color: '#d1d5db',
              fontSize: '28px', // Increased by 4px from default 24px
              '&.Mui-active': {
                color: levelsetGreen,
              },
              '&.Mui-completed': {
                color: levelsetGreen,
              },
            },
            '& .MuiStepIcon-text': {
              fill: 'white',
              fontSize: '16px',
              fontWeight: 600,
            },
          }}
        >
          {steps.map((step, index) => (
            <Step key={step.label} active={true} completed={false}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontFamily,
                    fontWeight: 600,
                    fontSize: '16px',
                  },
                }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ mt: 1, mb: 2 }}>
                  {step.description}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          padding: "16px 24px",
          borderTop: "1px solid #e9eaeb",
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            textTransform: "none",
            backgroundColor: levelsetGreen,
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#2d5a42",
            },
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  );
}

