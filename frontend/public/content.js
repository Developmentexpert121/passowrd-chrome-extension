// Content script to detect and fill login forms

let loginFields = null;

// Function to detect login fields (supports two-step login)
function detectLoginFields() {
  // More robust selectors for email/username
  const emailSelectors = [
    'input[name*="email"]',
    'input[name*="username"]',
    'input[name*="user"]',
    'input[placeholder*="email"]',
    'input[placeholder*="username"]',
    'input[placeholder*="user"]',
    'input[id*="email"]',
    'input[id*="username"]',
    'input[id*="user"]',
    'input[aria-label*="email"]',
    'input[aria-label*="username"]',
    'input[aria-label*="user"]',
    'input[type="email"]',
    'input[type="text"]:not([type="password"])',
  ];

  let usernameInput = null;
  for (const selector of emailSelectors) {
    const inputs = document.querySelectorAll(selector);
    if (inputs.length > 0) {
      usernameInput = inputs[0]; // Take the first match
      break;
    }
  }

  // Find password input
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const passwordInput = passwordInputs.length > 0 ? passwordInputs[0] : null;

  // Return fields based on what's available (supports two-step)
  if (usernameInput && passwordInput) {
    return { username: usernameInput, password: passwordInput };
  } else if (usernameInput) {
    return { username: usernameInput, password: null };
  } else if (passwordInput) {
    return { username: null, password: passwordInput };
  }
  return null;
}

// Detect on load and on DOM changes
function init() {
  loginFields = detectLoginFields();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillCredentials" && loginFields) {
    // Check site match
    if (
      request.website &&
      !window.location.hostname.includes(request.website)
    ) {
      sendResponse({ success: false, reason: "Site mismatch" });
      return;
    }

    let filledEmail = false;
    let filledPassword = false;

    if (loginFields.username) {
      loginFields.username.focus();
      loginFields.username.value = request.email;
      loginFields.username.dispatchEvent(new Event("input", { bubbles: true }));
      loginFields.username.dispatchEvent(
        new Event("change", { bubbles: true })
      );
      filledEmail = true;
    }
    if (loginFields.password) {
      loginFields.password.focus();
      loginFields.password.value = request.password;
      loginFields.password.dispatchEvent(new Event("input", { bubbles: true }));
      loginFields.password.dispatchEvent(
        new Event("change", { bubbles: true })
      );
      filledPassword = true;
    }

    // Auto-click next if only email filled (two-step)
    if (filledEmail && !filledPassword) {
      setTimeout(() => {
        const nextButton =
          document.querySelector(
            'button[type="submit"], input[type="submit"]'
          ) ||
          Array.from(document.querySelectorAll("button")).find(
            (btn) =>
              btn.textContent.toLowerCase().includes("next") ||
              btn.textContent.toLowerCase().includes("continue") ||
              btn.textContent.toLowerCase().includes("submit")
          );
        if (nextButton) {
          nextButton.click();
        }
      }, 500); // Small delay
    }

    sendResponse({ success: true });
  } else {
    sendResponse({ success: false });
  }
});

// Initialize
init();

// Also listen for DOM changes in case form loads later
const observer = new MutationObserver(init);
observer.observe(document.body, { childList: true, subtree: true });
