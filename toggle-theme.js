const primaryColorScheme = ""; // "light" | "dark"

// Check if browser supports prefers-color-scheme media query
function supportsSystemTheme() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").media !== "not all"
  );
}

// Safely get system theme preference with fallback
function getSystemTheme() {
  if (!supportsSystemTheme()) {
    // Fallback to light theme if system theme detection is not supported
    return "light";
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch (e) {
    // Fallback to light theme on error
    return "light";
  }
}

// Check if user has manually overridden the theme (only in current session)
function hasManualOverride() {
  const stored = sessionStorage.getItem("theme-override");
  return stored === "true";
}

// Set manual override flag (only in current session, cleared on refresh)
function setManualOverride(override) {
  try {
    if (override) {
      sessionStorage.setItem("theme-override", "true");
      // Also store the system theme at the time of override
      sessionStorage.setItem("system-theme-at-override", getSystemTheme());
    } else {
      sessionStorage.removeItem("theme-override");
      sessionStorage.removeItem("system-theme-at-override");
    }
  } catch (e) {
    console.warn("Failed to save override preference:", e);
  }
}

function getPreferTheme() {
  // If user has manually overridden in current session, use the stored theme
  if (hasManualOverride()) {
    const storedTheme = sessionStorage.getItem("theme");
    if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
      return storedTheme;
    }
  }
  
  // Default: follow system theme
  if (primaryColorScheme) return primaryColorScheme;
  return getSystemTheme();
}

let themeValue = getPreferTheme();

function setPreference() {
  // Save the actual theme value to sessionStorage (cleared on refresh)
  try {
    sessionStorage.setItem("theme", themeValue);
  } catch (e) {
    // Handle sessionStorage errors (e.g., in private browsing mode)
    console.warn("Failed to save theme preference:", e);
  }
  reflectPreference();
}

function reflectPreference() {
  document.firstElementChild.setAttribute("data-theme", themeValue);

  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

  // Get a reference to the body element
  const body = document.body;

  // Check if the body element exists before using getComputedStyle
  if (body) {
    // Get the computed styles for the body element
    const computedStyles = window.getComputedStyle(body);

    // Get the background color property
    const bgColor = computedStyles.backgroundColor;

    // Set the background color in <meta theme-color ... />
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
}

// Clear any old localStorage and sessionStorage theme data on page load
// This ensures we always start fresh and follow system theme on refresh
try {
  localStorage.removeItem("theme");
  localStorage.removeItem("theme-override");
  localStorage.removeItem("system-theme-at-override");
  // Clear sessionStorage to reset manual overrides on refresh
  sessionStorage.removeItem("theme");
  sessionStorage.removeItem("theme-override");
  sessionStorage.removeItem("system-theme-at-override");
} catch (e) {
  // Ignore errors
}

// set early so no page flashes / CSS is made aware
// Always start with system theme on page load (ignore any stored preferences)
themeValue = getSystemTheme();
reflectPreference();

window.onload = () => {
  function setThemeFeature() {
    // set on load so screen readers can get the latest value on the button
    reflectPreference();

    // now this script can find and listen for clicks on the control
    const themeBtn = document.querySelector("#theme-btn");
    if (themeBtn) {
      // Remove existing listeners to avoid duplicates
      const newBtn = themeBtn.cloneNode(true);
      themeBtn.parentNode?.replaceChild(newBtn, themeBtn);
      
      newBtn.addEventListener("click", () => {
        // Get current theme value
        const storedTheme = sessionStorage.getItem("theme");
        if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
          themeValue = storedTheme;
        } else {
          // If no stored theme, use current system theme
          themeValue = getSystemTheme();
        }
        
        // Toggle theme
        themeValue = themeValue === "light" ? "dark" : "light";
        
        // Mark as manual override and save (only in current session)
        setManualOverride(true);
        setPreference();
      });
    }
  }

  setThemeFeature();

  // Runs on view transitions navigation
  document.addEventListener("astro:after-swap", setThemeFeature);
};

// Set theme-color value before page transition
// to avoid navigation bar color flickering in Android dark mode
document.addEventListener("astro:before-swap", event => {
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  event.newDocument
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bgColor);
});

// sync with system changes
if (supportsSystemTheme()) {
  try {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", ({ matches: isDark }) => {
        const newSystemTheme = isDark ? "dark" : "light";
        const currentTheme = themeValue;
        
        // If user has manually overridden, check if system theme changed
        // and if it's different from current theme, switch back to system
        if (hasManualOverride()) {
          // If system theme changed and is different from current, switch to system
          if (newSystemTheme !== currentTheme) {
            themeValue = newSystemTheme;
            // Clear manual override since we're switching back to system
            setManualOverride(false);
            setPreference();
          }
        } else {
          // No manual override, just follow system
          themeValue = newSystemTheme;
          setPreference();
        }
      });
  } catch (e) {
    // Handle errors when adding event listener
    console.warn("Failed to listen for system theme changes:", e);
  }
}
