// Content script to detect and fill login forms

let loginFields = null;

// Function to detect login fields
function detectLoginFields() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  if (passwordInputs.length === 0) return null;

  // Assume the first password input is for login
  const passwordInput = passwordInputs[0];

  // Find the username/email input before the password
  let usernameInput = null;
  const inputs = document.querySelectorAll("input");
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i] === passwordInput && i > 0) {
      for (let j = i - 1; j >= 0; j--) {
        const input = inputs[j];
        if (input.type === "text" || input.type === "email") {
          usernameInput = input;
          break;
        }
      }
      break;
    }
  }

  if (usernameInput && passwordInput) {
    return { username: usernameInput, password: passwordInput };
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
    loginFields.username.value = request.email;
    loginFields.password.value = request.password;
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
