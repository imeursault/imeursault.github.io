const primaryColorScheme = ""; // "light" | "dark"
const followSystemTheme = true; // Set to true to always follow system theme

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

// Check if we should follow system theme
function shouldFollowSystem() {
  if (!followSystemTheme) {
    // If followSystemTheme is false, check if stored theme is "auto"
    const storedTheme = localStorage.getItem("theme");
    return storedTheme === "auto";
  }
  // If followSystemTheme is true, always follow system
  // This means we ignore any manual theme selections in localStorage
  return true;
}

function getPreferTheme() {
  // If following system theme, always use system preference
  if (shouldFollowSystem()) {
    return getSystemTheme();
  }

  // return theme value in local storage if it is set
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme && storedTheme !== "auto") return storedTheme;

  // return primary color scheme if it is set
  if (primaryColorScheme) return primaryColorScheme;

  // return user device's prefer color scheme
  return getSystemTheme();
}

let themeValue = getPreferTheme();

function setPreference() {
  // If following system theme, save "auto" to localStorage
  try {
    if (shouldFollowSystem()) {
      localStorage.setItem("theme", "auto");
    } else {
      // Save the actual theme value
      localStorage.setItem("theme", themeValue);
    }
  } catch (e) {
    // Handle localStorage errors (e.g., in private browsing mode)
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

// set early so no page flashes / CSS is made aware
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
        // If currently following system, get current system theme first
        if (shouldFollowSystem()) {
          themeValue = getSystemTheme();
        }
        // Toggle theme
        themeValue = themeValue === "light" ? "dark" : "light";
        // Save the manual choice (this will stop following system)
        try {
          localStorage.setItem("theme", themeValue);
        } catch (e) {
          // Handle localStorage errors (e.g., in private browsing mode)
          console.warn("Failed to save theme preference:", e);
        }
        reflectPreference();
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
        // Only sync if following system theme
        if (shouldFollowSystem()) {
          themeValue = isDark ? "dark" : "light";
          setPreference();
        }
      });
  } catch (e) {
    // Handle errors when adding event listener
    console.warn("Failed to listen for system theme changes:", e);
  }
}
