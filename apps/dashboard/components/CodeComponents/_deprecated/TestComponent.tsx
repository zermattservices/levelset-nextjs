import * as React from "react";

export function TestComponent({ message }: { message?: string }) {
  return (
    <div style={{ 
      padding: "20px", 
      border: "2px solid #007acc", 
      borderRadius: "8px",
      backgroundColor: "#f0f8ff",
      textAlign: "center"
    }}>
      <h2>🧪 Test Component</h2>
      <p>{message || "This is a test component for Plasmic!"}</p>
      <p>If you can see this, Plasmic integration is working!</p>
    </div>
  );
}
