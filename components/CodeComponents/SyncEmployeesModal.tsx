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
    
    // Bookmarklet that automatically extracts employee data from HotSchedules page
    const code = `javascript:(function(){
var baseUrl='${baseUrl}';
var employees=null;
var errorMsg='';
try{
if(typeof window.hsEmployees!=='undefined'&&Array.isArray(window.hsEmployees)){
employees=window.hsEmployees;
}else if(typeof window.employees!=='undefined'&&Array.isArray(window.employees)){
employees=window.employees;
}else if(typeof window.app!=='undefined'&&window.app.employees&&Array.isArray(window.app.employees)){
employees=window.app.employees;
}else{
var scripts=document.querySelectorAll('script');
for(var i=0;i<scripts.length;i++){
var text=scripts[i].textContent||scripts[i].innerText;
if(text.includes('employees')&&text.includes('[')){
try{
var match=text.match(/employees\\s*[:=]\\s*(\\[[\\s\\S]*?\\])/);
if(match){
employees=JSON.parse(match[1]);
break;
}
}catch(e){}
}
}
}
if(!employees||!Array.isArray(employees)||employees.length===0){
errorMsg='Could not find employee data on this page. Please ensure you are on a HotSchedules page with employee data loaded.';
}
}catch(e){
errorMsg='Error extracting employee data: '+e.message;
}
if(errorMsg){
alert(errorMsg);
return;
}
var loadingDiv=document.createElement('div');
loadingDiv.style.cssText='position:fixed;top:20px;right:20px;background:#31664a;color:white;padding:15px 20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;';
loadingDiv.textContent='Syncing employees...';
document.body.appendChild(loadingDiv);
fetch(baseUrl+'/api/employees/sync-hotschedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(employees)}).then(function(r){return r.json();}).then(function(data){loadingDiv.remove();var resultDiv=document.createElement('div');resultDiv.style.cssText='position:fixed;top:20px;right:20px;background:'+(data.success?'#10b981':'#ef4444')+';color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';if(data.success){resultDiv.innerHTML='<strong>✓ Sync Successful!</strong><br><br>Created: '+data.stats.created+'<br>Updated: '+data.stats.updated+'<br>Deactivated: '+data.stats.deactivated+'<br>Total: '+data.stats.total_processed;}else{resultDiv.innerHTML='<strong>✗ Sync Failed</strong><br><br>'+data.error+(data.details?'<br><br>Details: '+data.details:'');}document.body.appendChild(resultDiv);setTimeout(function(){resultDiv.remove();},8000);}).catch(function(err){loadingDiv.remove();var errorDiv=document.createElement('div');errorDiv.style.cssText='position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';errorDiv.innerHTML='<strong>✗ Network Error</strong><br><br>'+err.message;document.body.appendChild(errorDiv);setTimeout(function(){errorDiv.remove();},8000);});
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
            <Typography variant="body2" sx={{ fontFamily, mb: 1, fontWeight: 600 }}>
              💡 Tip: If you don't see your bookmarks bar, press <code>Ctrl+Shift+B</code> (Windows/Linux) or <code>Cmd+Shift+B</code> (Mac) to show it.
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
              🔗 Sync HotSchedules Employees
            </BookmarkletLink>
          </Box>
          <Typography variant="body2" sx={{ fontFamily, fontSize: 12, color: '#6b7280', mt: 1 }}>
            Drag this link to your bookmarks bar
          </Typography>
        </>
      ),
    },
    {
      label: 'Run the Sync',
      description: (
        <>
          <Typography variant="body2" sx={{ mb: 1, fontFamily }}>
            Once you're on a HotSchedules page with employee data loaded:
          </Typography>
          <ol style={{ fontFamily, paddingLeft: '20px', marginTop: '8px' }}>
            <li style={{ marginBottom: '8px' }}>
              <Typography variant="body2" component="span" sx={{ fontFamily }}>
                Navigate to a page in HotSchedules that displays employee information (e.g., Employee List, Roster, etc.)
              </Typography>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Typography variant="body2" component="span" sx={{ fontFamily }}>
                Click the bookmarklet you just added to your bookmarks bar
              </Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" sx={{ fontFamily }}>
                The bookmarklet will automatically extract employee data and sync it to Levelset
              </Typography>
            </li>
          </ol>
          <InstructionBox sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontFamily, fontSize: 12, color: '#6b7280' }}>
              <strong>Note:</strong> The bookmarklet will automatically detect employee data from the HotSchedules page. 
              If it cannot find the data, make sure you're on a page that has employee information loaded.
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
        <Stepper orientation="vertical">
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

