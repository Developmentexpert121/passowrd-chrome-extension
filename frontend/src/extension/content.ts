import type { CredentialRequest } from "./types";

class PasswordProtector {
    private readonly PROTECTED_ATTR = "data-protected-by-manager";
    private observer: MutationObserver | null = null;
    private pendingPassword: string | null = null;

    constructor() {
        this.init();
    }

    private init(): void {
        this.setupMessageListener();
        this.setupEventListeners();
        this.observeDOMChanges();
    }

    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener(
            (request: CredentialRequest, sender: any, sendResponse: any) => {
                if (request.action === "fillCredentials") {
                    console.log("Fill request received for email:", request.email);
                    this.fillCredentialsSecurely(request.email || "", request.password || "");
                    sendResponse({ success: true });
                }
            }
        );
    }

    private setupEventListeners(): void {
        document.addEventListener("DOMContentLoaded", () => {
            this.disablePasswordToggleButtons();
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                this.disablePasswordToggleButtons();
            }
        });

        // Fill password when user focuses it, if still pending
        document.addEventListener(
            "focus",
            (e) => {
                const target = e.target as HTMLInputElement;
                if (
                    target.type === "password" &&
                    this.pendingPassword &&
                    target.value === ""
                ) {
                    console.log("Password field focused, filling now...");
                    this.fillPasswordField(target, this.pendingPassword);
                }
            },
            true
        );
    }

    private observeDOMChanges(): void {
        this.observer = new MutationObserver(() => {
            this.disablePasswordToggleButtons();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["type", "class", "disabled"],
        });
    }

    private fillCredentialsSecurely(email: string, password: string): void {
        console.log("=== Starting fill process ===");

        this.pendingPassword = password;

        const emailField = this.findEmailField();
        if (emailField) {
            console.log("Filling email field...");
            this.fillField(emailField, email);
        }

        const passwordField = this.findPasswordField();
        if (passwordField) {
            console.log("Password field found, filling now...");
            this.fillPasswordField(passwordField, password);
        } else {
            console.log("Password field not found, will fill on focus...");
        }
    }

    private fillField(field: HTMLInputElement, value: string): void {
        try {
            const wasReadonly = field.readOnly;
            field.readOnly = false;

            const setter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;
            if (setter) {
                setter.call(field, value);
            } else {
                field.value = value;
            }

            this.dispatchAllEvents(field);
            if (wasReadonly) field.readOnly = true;

            console.log("Field filled with value:", value);
        } catch (error) {
            console.error("Error filling field:", error);
        }
    }

    private fillPasswordField(field: HTMLInputElement, password: string): void {
        console.log("=== Attempting to fill password field ===");

        try {
            field.readOnly = false;

            // Fill the password
            const setter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;
            if (setter) {
                setter.call(field, password);
            } else {
                field.value = password;
            }

            this.dispatchAllEvents(field);

            // Confirm fill worked
            setTimeout(() => {
                if (field.value === password) {
                    console.log("✓ SUCCESS: Password is correctly filled!");
                    // Only disable show/hide buttons, not the password input
                    this.disablePasswordToggleButtons();
                } else {
                    console.warn("✗ FAILED: Password fill mismatch, retrying...");
                    field.value = password;
                    this.dispatchAllEvents(field);
                    this.disablePasswordToggleButtons();
                }
            }, 200);
        } catch (error) {
            console.error("Error filling password field:", error);
        }
    }

    private dispatchAllEvents(element: HTMLInputElement): void {
        const events = [
            new Event("input", { bubbles: true, composed: true }),
            new Event("change", { bubbles: true, composed: true }),
            new Event("blur", { bubbles: true, composed: true }),
            new Event("focus", { bubbles: true, composed: true }),
            new KeyboardEvent("keydown", { bubbles: true, composed: true }),
            new KeyboardEvent("keyup", { bubbles: true, composed: true }),
            new KeyboardEvent("keypress", { bubbles: true, composed: true }),
            new Event("click", { bubbles: true, composed: true }),
        ];

        events.forEach((event) => {
            try {
                element.dispatchEvent(event);
            } catch (e) {
                console.warn("Could not dispatch event:", e);
            }
        });
    }

    private disablePasswordToggleButtons(): void {
        const toggleSelectors = [
            'button[data-testid*="password"]',
            'button[aria-label*="password"]',
            'button[aria-label*="show"]',
            'button[aria-label*="hide"]',
            ".password-toggle",
            "[class*='password-toggle']",
            "[class*='show-password']",
            "[class*='toggle-password']",
        ];

        toggleSelectors.forEach((selector: string) => {
            document.querySelectorAll(selector).forEach((btn: Element) => {
                const button = btn as HTMLButtonElement;
                if (button.getAttribute(this.PROTECTED_ATTR) !== "true") {
                    button.disabled = true;
                    button.style.pointerEvents = "none";
                    button.style.opacity = "0.5";
                    button.style.cursor = "not-allowed";
                    button.title = "Show/Hide password is disabled";
                    button.setAttribute(this.PROTECTED_ATTR, "true");
                }
            });
        });

        // Check for text/eye-based buttons
        const allButtons = document.querySelectorAll("button");
        allButtons.forEach((button: Element) => {
            const btn = button as HTMLButtonElement;
            const innerText = btn.innerText?.toLowerCase() || "";
            const innerHTML = btn.innerHTML?.toLowerCase() || "";

            if (
                btn.getAttribute(this.PROTECTED_ATTR) !== "true" &&
                (innerText.includes("show") ||
                    innerText.includes("hide") ||
                    innerText.includes("eye") ||
                    innerHTML.includes("show") ||
                    innerHTML.includes("hide") ||
                    innerHTML.includes("eye"))
            ) {
                btn.disabled = true;
                btn.style.pointerEvents = "none";
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
                btn.title = "Show/Hide password is disabled";
                btn.setAttribute(this.PROTECTED_ATTR, "true");
            }
        });
    }

    private findEmailField(): HTMLInputElement | null {
        const selectors = [
            'input[type="email"]',
            'input[autocomplete="email"]',
            'input[autocomplete="username"]',
            'input[name*="email"]',
            'input[name*="user"]',
            'input[name*="login"]',
            'input[id*="email"]',
            'input[id*="user"]',
            'input[id*="login"]',
        ];
        for (const selector of selectors) {
            const field = document.querySelector(selector) as HTMLInputElement;
            if (field && field.offsetParent !== null) return field;
        }
        return null;
    }

    private findPasswordField(): HTMLInputElement | null {
        return document.querySelector('input[type="password"]') as HTMLInputElement;
    }

    public destroy(): void {
        if (this.observer) this.observer.disconnect();
    }
}

// Delay initialization for slower pages
setTimeout(() => {
    console.log("Running delayed initialization...");
    new PasswordProtector();
}, 100);