// Diagnostic utility to check for common issues
export const runDiagnostics = () => {
  const issues = [];

  // Check if we're in browser environment
  if (typeof window === "undefined") {
    issues.push("❌ Not in browser environment");
    return issues;
  }

  // Check localStorage
  try {
    localStorage.getItem("test");
  } catch (e) {
    issues.push("❌ localStorage not available");
  }

  // Check if React Query is available
  if (!window.ReactQuery) {
    issues.push("⚠️ React Query not detected in window object");
  }

  // Check if auth service is available
  if (!window.authService) {
    issues.push("⚠️ Auth service not detected in window object");
  }

  // Check console for errors
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => {
    errors.push(args.join(" "));
    originalError.apply(console, args);
  };

  // Check for common React errors
  const reactErrors = errors.filter(
    (error) =>
      error.includes("React") ||
      error.includes("useEffect") ||
      error.includes("useState") ||
      error.includes("Cannot read property") ||
      error.includes("undefined is not a function")
  );

  if (reactErrors.length > 0) {
    issues.push(`❌ React errors detected: ${reactErrors.length} errors`);
  }

  // Restore original console.error
  console.error = originalError;

  // Check API connectivity
  fetch("/api/v1/health")
    .then((res) => {
      if (!res.ok) {
        issues.push(`❌ API health check failed: ${res.status}`);
      }
    })
    .catch(() => {
      issues.push("❌ API not reachable");
    });

  return issues;
};

export const logDiagnostics = () => {
  const issues = runDiagnostics();
  console.log("🔍 System Diagnostics:");
  if (issues.length === 0) {
    console.log("✅ No issues detected");
  } else {
    issues.forEach((issue) => console.log(issue));
  }
  return issues;
};
