console.log("Popup script loaded");

document.getElementById("run").addEventListener("click", async () => {
  console.log("Button clicked");
  
  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Current tab URL:", tab.url);
    
    if (!tab.url.includes('sellercentral.amazon.in')) {
      alert('Please navigate to Amazon Seller Central (sellercentral.amazon.in) first!');
      return;
    }
    
    console.log("Testing content script connection...");
    
    try {
      // Try to communicate with existing content script
      const testResponse = await chrome.tabs.sendMessage(tab.id, {action: "test"});
      console.log("Content script already loaded:", testResponse);
      
      // Start automation
      const response = await chrome.tabs.sendMessage(tab.id, {action: "startAutomation"});
      console.log("Automation response:", response);
      alert("✅ Automation started successfully!");
      
    } catch (contentScriptError) {
      console.log("Content script not available, injecting it now...");
      
      try {
        // Inject content script programmatically
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        console.log("Content script injected successfully");
        
        // Wait a moment for it to initialize
        setTimeout(async () => {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, {action: "startAutomation"});
            console.log("Automation started after injection:", response);
            alert("✅ Automation started successfully!");
          } catch (err) {
            console.error("Still can't communicate after injection:", err);
            // Fallback to direct execution
            startDirectAutomation(tab.id);
          }
        }, 1000);
        
      } catch (injectionError) {
        console.error("Failed to inject content script:", injectionError);
        // Final fallback - direct execution
        startDirectAutomation(tab.id);
      }
    }
    
  } catch (error) {
    console.error("General error:", error);
    alert("Error: " + error.message);
  }
});

// Add event listener for stop button if it exists
document.addEventListener('DOMContentLoaded', () => {
  const stopBtn = document.getElementById("stop");
  if (stopBtn) {
    stopBtn.addEventListener("click", async () => {
      try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, {action: "stopAutomation"});
        console.log("Stop response:", response);
        alert("Automation stopped!");
      } catch (error) {
        console.error("Error stopping automation:", error);
      }
    });
  }
  
  // View Progress button
  const viewProgressBtn = document.getElementById("viewProgress");
  if (viewProgressBtn) {
    viewProgressBtn.addEventListener("click", () => {
      displayProgress();
    });
  }
  
  // Clear Progress button
  const clearProgressBtn = document.getElementById("clearProgress");
  if (clearProgressBtn) {
    clearProgressBtn.addEventListener("click", () => {
      clearAutomationProgress();
    });
  }
  
  // Show progress on popup load
  displayProgress();
}); 

// Progress management functions
const STEPS_DISPLAY = {
  'start': '🚀 Starting',
  'account_switch': '👤 Account Switch',
  'navigation': '🧭 Navigation', 
  'form_selection': '📝 Form Selection',
  'product_details': '📦 Product Details',
  'compliance': '✅ Compliance',
  'pricing': '💰 Pricing',
  'completion': '🎉 Completion'
};

function getStoredProgress() {
  try {
    const saved = localStorage.getItem('automationProgress');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error reading progress:', error);
    return null;
  }
}

function displayProgress() {
  const progressInfo = document.getElementById('progressInfo');
  const currentStepDiv = document.getElementById('currentStep');
  const stepsListDiv = document.getElementById('stepsList');
  const lastUpdateDiv = document.getElementById('lastUpdate');
  
  const progress = getStoredProgress();
  
  if (!progress) {
    progressInfo.style.display = 'none';
    return;
  }
  
  progressInfo.style.display = 'block';
  
  // Current step
  const stepDisplay = STEPS_DISPLAY[progress.step] || progress.step;
  currentStepDiv.innerHTML = `<strong>Current Step:</strong> ${stepDisplay}`;
  
  // Steps list with status
  const allSteps = Object.keys(STEPS_DISPLAY);
  const currentIndex = allSteps.indexOf(progress.step);
  
  let stepsHtml = '<div style="margin: 10px 0;"><strong>Progress:</strong></div>';
  allSteps.forEach((step, index) => {
    const stepName = STEPS_DISPLAY[step];
    let className = 'step-indicator';
    let status = '';
    
    if (index < currentIndex) {
      className += ' step-completed';
      status = ' ✅';
    } else if (index === currentIndex) {
      className += ' step-current';
      status = ' ⏳';
    } else {
      status = ' ⏸️';
    }
    
    stepsHtml += `<div class="${className}">${stepName}${status}</div>`;
  });
  
  stepsListDiv.innerHTML = stepsHtml;
  
  // Last update
  const lastUpdate = new Date(progress.timestamp).toLocaleString();
  lastUpdateDiv.innerHTML = `<strong>Last Update:</strong> ${lastUpdate}`;
  
  // Show additional data if available
  if (progress.data && progress.data.url) {
    lastUpdateDiv.innerHTML += `<br><strong>URL:</strong> ${progress.data.url.substring(0, 50)}...`;
  }
}

function clearAutomationProgress() {
  if (confirm('Are you sure you want to clear the automation progress? This will restart from the beginning next time.')) {
    localStorage.removeItem('automationProgress');
    console.log('🗑️ Progress cleared');
    alert('Progress cleared successfully!');
    displayProgress(); // Refresh display
  }
}

// Auto-refresh progress display every 5 seconds when popup is open
setInterval(() => {
  if (document.getElementById('progressInfo').style.display !== 'none') {
    displayProgress();
  }
}, 5000);

// Fallback function for direct script execution
async function startDirectAutomation(tabId) {
  console.log("Using direct automation fallback");
  alert("Starting automation with direct injection...");
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: runDirectAutomation
    });
  } catch (error) {
    console.error("Direct automation failed:", error);
    alert("❌ Automation failed. Please try refreshing the page and extension.");
  }
}

// Direct automation function that runs in the page context
function runDirectAutomation() {
  console.log("🚀 Direct automation started!");
  
  // Enhanced waiting utilities
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  
  // Checkpoint system
  const STEPS = {
    START: 'start',
    ACCOUNT_SWITCH: 'account_switch',
    NAVIGATION: 'navigation', 
    FORM_SELECTION: 'form_selection',
    PRODUCT_DETAILS: 'product_details',
    COMPLIANCE: 'compliance',
    PRICING: 'pricing',
    COMPLETION: 'completion'
  };
  
  const saveProgress = (step, data = {}) => {
    const progress = {
      step: step,
      timestamp: Date.now(),
      url: window.location.href,
      data: data
    };
    localStorage.setItem('automationProgress', JSON.stringify(progress));
    console.log(`💾 Progress saved: ${step}`);
  };
  
  const getProgress = () => {
    try {
      const saved = localStorage.getItem('automationProgress');
      return saved ? JSON.parse(saved) : { step: STEPS.START };
    } catch (error) {
      console.error('Error reading progress:', error);
      return { step: STEPS.START };
    }
  };
  
  const clearProgress = () => {
    localStorage.removeItem('automationProgress');
    console.log('🗑️ Progress cleared');
  };
  
  const shouldSkipStep = (currentStep) => {
    const progress = getProgress();
    const stepOrder = Object.values(STEPS);
    const savedIndex = stepOrder.indexOf(progress.step);
    const currentIndex = stepOrder.indexOf(currentStep);
    
    return currentIndex <= savedIndex;
  };
  
  // Wait for element to be present and visible
  const waitForElement = (selector, timeout = 30000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        
        if (element && element.offsetParent !== null) {
          console.log(`✅ Element found: ${selector}`);
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.error(`❌ Timeout waiting for element: ${selector}`);
          reject(new Error(`Timeout waiting for element: ${selector}`));
          return;
        }
        
        setTimeout(checkElement, 500);
      };
      
      checkElement();
    });
  };
  
  // Wait for page to be fully loaded
  const waitForPageLoad = () => {
    return new Promise((resolve) => {
      const checkLoading = () => {
        if (document.readyState === 'complete' && 
            !document.querySelector('[data-testid="loading"]') && 
            !document.querySelector('.loading') &&
            !document.querySelector('[class*="spinner"]')) {
          console.log("✅ Page fully loaded");
          resolve();
        } else {
          console.log("⏳ Page still loading...");
          setTimeout(checkLoading, 1000);
        }
      };
      checkLoading();
    });
  };
  
  // Enhanced click with retry
  const clickWithRetry = async (element, description, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (element && element.offsetParent !== null) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await wait(500);
          element.click();
          console.log(`✅ ${description} - clicked successfully`);
          return true;
        }
      } catch (error) {
        console.log(`⚠️ ${description} - attempt ${i + 1} failed:`, error.message);
      }
      await wait(1000);
    }
    throw new Error(`Failed to click ${description} after ${maxRetries} attempts`);
  };
  
  // Enhanced input handling for Amazon's custom components
  const safeInput = async (element, value, description, maxRetries = 3) => {
    if (!element) {
      console.error(`❌ ${description} input not found`);
      return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting to input ${description}: "${value}" (attempt ${attempt})`);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await wait(300);
        
        // Handle different types of elements
        if (element.tagName.toLowerCase() === 'kat-input') {
          // Amazon's custom kat-input elements
          await handleKatInput(element, value, description);
        } else if (element.shadowRoot) {
          // Generic shadow DOM elements
          await handleShadowDomInput(element, value, description);
        } else if (element.tagName.toLowerCase() === 'textarea') {
          // Regular textarea
          await handleTextArea(element, value, description);
        } else {
          // Regular input elements
          await handleRegularInput(element, value, description);
        }
        
        // Verify the value was set
        await wait(500);
        const actualValue = getElementValue(element);
        
        if (actualValue === value || actualValue.includes(value)) {
          console.log(`✅ ${description} successfully set to: "${actualValue}"`);
          return true;
        } else {
          console.log(`⚠️ ${description} verification failed. Expected: "${value}", Got: "${actualValue}"`);
          debugElement(element, `${description} (failed verification)`);
          if (attempt === maxRetries) {
            console.error(`❌ ${description} failed after ${maxRetries} attempts`);
            return false;
          }
        }
        
      } catch (error) {
        console.log(`⚠️ ${description} attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          console.error(`❌ ${description} failed after ${maxRetries} attempts`);
          return false;
        }
      }
      
      await wait(1000); // Wait before retry
    }
    
    return false;
  };
  
  // Handle Amazon's kat-input custom elements
  const handleKatInput = async (element, value, description) => {
    // Try to find the actual input inside the kat-input
    let actualInput = null;
    
    if (element.shadowRoot) {
      actualInput = element.shadowRoot.querySelector('input') || 
                   element.shadowRoot.querySelector('textarea');
    }
    
    if (!actualInput) {
      // Fallback: look for input as a child
      actualInput = element.querySelector('input') || 
                   element.querySelector('textarea');
    }
    
    if (actualInput) {
      console.log(`🎯 Found actual input inside ${description}`);
      await handleRegularInput(actualInput, value, description);
    } else {
      // Direct property setting for custom elements
      console.log(`🔧 Setting value directly on ${description}`);
      element.focus();
      
      // Try multiple ways to set the value
      if ('value' in element) element.value = value;
      if ('_value' in element) element._value = value;
      if (element.setValue) element.setValue(value);
      
      // Trigger events on the custom element
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  };
  
  // Handle shadow DOM elements
  const handleShadowDomInput = async (element, value, description) => {
    const shadowInput = element.shadowRoot.querySelector('input') || 
                       element.shadowRoot.querySelector('textarea');
    
    if (shadowInput) {
      await handleRegularInput(shadowInput, value, description);
    } else {
      await handleRegularInput(element, value, description);
    }
  };
  
  // Handle regular input elements
  const handleRegularInput = async (element, value, description) => {
    // Focus the element
    element.focus();
    await wait(100);
    
    // Clear existing value
    element.select();
    document.execCommand('delete');
    
    // Set the value multiple ways for compatibility
    element.value = value;
    
    // Create and dispatch realistic events
    const events = [
      new Event('focus', { bubbles: true }),
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('change', { bubbles: true, cancelable: true }),
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
      new Event('blur', { bubbles: true })
    ];
    
    for (const event of events) {
      element.dispatchEvent(event);
      await wait(50);
    }
    
    // Additional React-style events
    if (element._valueTracker) {
      element._valueTracker.setValue('');
    }
  };
  
  // Handle textarea elements
  const handleTextArea = async (element, value, description) => {
    element.focus();
    await wait(100);
    
    // Clear and set value
    element.select();
    element.value = value;
    
    // Trigger events
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  };
  
  // Get the actual value from various element types
  const getElementValue = (element) => {
    if (element.tagName.toLowerCase() === 'kat-input') {
      if (element.shadowRoot) {
        const input = element.shadowRoot.querySelector('input') || 
                     element.shadowRoot.querySelector('textarea');
        if (input) return input.value;
      }
      return element.value || element.getAttribute('value') || '';
    }
    
    return element.value || '';
  };
  
  // Debug function to inspect element properties
  const debugElement = (element, description) => {
    console.log(`🔍 Debugging ${description}:`);
    console.log('- Tag name:', element.tagName.toLowerCase());
    console.log('- Has shadow root:', !!element.shadowRoot);
    console.log('- Current value:', element.value);
    console.log('- Has setValue method:', typeof element.setValue === 'function');
    console.log('- Visible:', element.offsetParent !== null);
    console.log('- Disabled:', element.disabled);
    console.log('- Readonly:', element.readOnly);
    
    if (element.shadowRoot) {
      const shadowInput = element.shadowRoot.querySelector('input') || 
                         element.shadowRoot.querySelector('textarea');
      if (shadowInput) {
        console.log('- Shadow input found:', shadowInput.tagName.toLowerCase());
        console.log('- Shadow input value:', shadowInput.value);
        console.log('- Shadow input disabled:', shadowInput.disabled);
      } else {
        console.log('- No shadow input found');
      }
    }
  };
  
  // Create progress indicator
  const createProgressIndicator = () => {
    // Remove existing indicator
    const existing = document.getElementById('automation-progress');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed; top: 10px; right: 10px; 
      background: #4CAF50; color: white; 
      padding: 10px; border-radius: 5px; 
      z-index: 10000; font-family: Arial;
      font-size: 12px; max-width: 200px;
    `;
    div.id = 'automation-progress';
    document.body.appendChild(div);
    return div;
  };

  const updateProgress = (message) => {
    const indicator = document.getElementById('automation-progress');
    if (indicator) indicator.innerHTML = message;
  };
  
  async function runSteps() {
    try {
      console.log("=== STARTING ENHANCED AUTOMATION WITH CHECKPOINTS ===");
      
      const progress = getProgress();
      console.log(`📋 Resuming from: ${progress.step}`);
      
      const progressIndicator = createProgressIndicator();
      updateProgress("🚀 Starting automation...");
      
      // STEP 1: Account switching
      if (!shouldSkipStep(STEPS.ACCOUNT_SWITCH)) {
        console.log("🔄 Step 1: Account switching...");
        updateProgress("🔄 Step 1: Account switching...");
        await waitForPageLoad();
        
        try {
          const accounts = document.querySelectorAll('[data-test="current-account"]');
          if (accounts.length > 1) {
            await clickWithRetry(accounts[1], "Second account");
            
            const confirmBtn = await waitForElement('[data-test="confirm-selection"]', 10000);
            await clickWithRetry(confirmBtn, "Account confirmation");
            await waitForPageLoad();
          } else {
            console.log("ℹ️ Account switch not needed");
          }
          saveProgress(STEPS.ACCOUNT_SWITCH);
        } catch (error) {
          console.log("ℹ️ Account switching skipped:", error.message);
          saveProgress(STEPS.ACCOUNT_SWITCH);
        }
      } else {
        console.log("⏭️ Skipping Step 1: Account switching (already completed)");
      }

      // STEP 2: Navigation
      if (!shouldSkipStep(STEPS.NAVIGATION)) {
        console.log("🔄 Step 2: Navigation...");
        updateProgress("🔄 Step 2: Navigation...");
        
        if (!window.location.href.includes('add-products')) {
          const hamburger = await waitForElement('[data-test-tag="hamburger-icon"]');
          await clickWithRetry(hamburger, "Hamburger menu");
          
          const catalog = await waitForElement('[data-menu-id="catalog"]');
          catalog.dispatchEvent(new Event("mouseenter"));
          await wait(1000);
          
          const addProducts = await waitForElement('[data-menu-id="add-products"]');
          await clickWithRetry(addProducts, "Add products");
          await waitForPageLoad();
        }
        saveProgress(STEPS.NAVIGATION, { url: window.location.href });
      } else {
        console.log("⏭️ Skipping Step 2: Navigation (already completed)");
      }

      // STEP 3: Form selection
      if (!shouldSkipStep(STEPS.FORM_SELECTION)) {
        console.log("🔄 Step 3: Form selection...");
        updateProgress("🔄 Step 3: Form selection...");
        
        const blankForm = await waitForElement('[data-testid="blank-form-selector"]');
        await clickWithRetry(blankForm, "Blank form");
        
        const submitBtn = await waitForElement('[data-testid="omnibox-submit-button"]');
        await clickWithRetry(submitBtn, "Submit form");
        await waitForPageLoad();
        
        saveProgress(STEPS.FORM_SELECTION, { url: window.location.href });
      } else {
        console.log("⏭️ Skipping Step 3: Form selection (already completed)");
      }

      // STEP 4: Product details
      if (!shouldSkipStep(STEPS.PRODUCT_DETAILS)) {
        console.log("🔄 Step 4: Product details...");
        updateProgress("🔄 Step 4: Product details...");
        
        const expandBtn = await waitForElement('[data-testid="expandButton"]');
        await clickWithRetry(expandBtn, "Expand button");
        
        const textArea = await waitForElement('[data-testid="queryInput"]');
        await safeInput(textArea, "Wall Shelf", "Product name");
        
        const generateBtn = await waitForElement('[data-testid="generateButton"]');
        await clickWithRetry(generateBtn, "Generate button");
        
        // Wait longer for AI generation
        console.log("⏳ Waiting for AI generation...");
        updateProgress("⏳ Waiting for AI generation...");
        await wait(12000);
        
        const confirmBtn = await waitForElement('[data-cy="pt-recommendations-confirm-button"]');
        await clickWithRetry(confirmBtn, "Confirm recommendations");
        
        const upcCheckbox = await waitForElement('[data-cy="upc-exemption-checkbox"]', 5000);
        if (upcCheckbox) {
          upcCheckbox.checked = true;
          upcCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        const nextBtn = await waitForElement('kat-button[id="next-button"]');
        await clickWithRetry(nextBtn, "Next button");
        await waitForPageLoad();
        
        saveProgress(STEPS.PRODUCT_DETAILS, { url: window.location.href });
      } else {
        console.log("⏭️ Skipping Step 4: Product details (already completed)");
      }

      // STEP 5: Compliance
      if (!shouldSkipStep(STEPS.COMPLIANCE)) {
        console.log("🔄 Step 5: Compliance...");
        updateProgress("🔄 Step 5: Compliance...");
        
        const acknowledgeBtn = await waitForElement('[label="Acknowledge"]');
        await clickWithRetry(acknowledgeBtn, "Acknowledge");
        
        const katCheckbox = await waitForElement('kat-checkbox#checkbox', 5000);
        if (katCheckbox && katCheckbox.shadowRoot) {
          const checkboxDiv = katCheckbox.shadowRoot.querySelector('[part="checkbox-check"]');
          if (checkboxDiv) {
            await clickWithRetry(checkboxDiv, "Compliance checkbox");
          }
        }
        
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await wait(1000);
        
        const complianceSubmitBtn = await waitForElement('kat-button[id="submit-button"]');
        await clickWithRetry(complianceSubmitBtn, "Compliance submit");
        
        const okBtn = await waitForElement('kat-button[label="OK"]', 10000);
        await clickWithRetry(okBtn, "OK button");
        await waitForPageLoad();
        
        saveProgress(STEPS.COMPLIANCE, { url: window.location.href });
      } else {
        console.log("⏭️ Skipping Step 5: Compliance (already completed)");
      }

      // STEP 6: Pricing
      if (!shouldSkipStep(STEPS.PRICING)) {
        console.log("🔄 Step 6: Pricing...");
        updateProgress("🔄 Step 6: Pricing...");
        
        const skuInput = await waitForElement('kat-input[name="contribution_sku-0-value"]');
        await safeInput(skuInput, "Bent 103", "SKU");
        
        const quantityInput = await waitForElement('[kat-aria-label="Quantity"]');
        await safeInput(quantityInput, "100", "Quantity");
        
        const priceInput = await waitForElement('[kat-aria-label="Your Price"]');
        await safeInput(priceInput, "693.00", "Price");
        
        const mrpInput = await waitForElement('[kat-aria-label="Maximum Retail Price"]');
        await safeInput(mrpInput, "1199.00", "MRP");

        // Handle condition dropdown
        const dropdown = await waitForElement('kat-dropdown[name="condition_type-0-value"]');
        if (dropdown && dropdown.shadowRoot) {
          const header = dropdown.shadowRoot.querySelector('[part="dropdown-header"]');
          if (header) {
            await clickWithRetry(header, "Condition dropdown");
            await wait(500);
            const newOption = dropdown.shadowRoot.querySelector('[part="dropdown-option0"]');
            if (newOption) {
              await clickWithRetry(newOption, "Condition option");
            }
          }
        }

        const fulfillmentBtn = await waitForElement('[constraint-label="(Merchant Fulfilled)"]');
        await clickWithRetry(fulfillmentBtn, "Fulfillment option");
        
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await wait(1000);
        
        const weightInput = await waitForElement('[name="item_package_weight-0-value"]');
        await safeInput(weightInput, "2", "Weight");
        
        const finalSubmitBtn = await waitForElement('kat-button[label="Submit"]');
        await clickWithRetry(finalSubmitBtn, "Final submit");
        
        const finalOkBtn = await waitForElement('kat-button[label="OK"]', 10000);
        await clickWithRetry(finalOkBtn, "Final OK");
        await waitForPageLoad();
        
        saveProgress(STEPS.PRICING, { url: window.location.href });
      } else {
        console.log("⏭️ Skipping Step 6: Pricing (already completed)");
      }
      
      // STEP 7: Completion
      if (!shouldSkipStep(STEPS.COMPLETION)) {
        console.log("🔄 Step 7: Quick copy...");
        updateProgress("🔄 Step 7: Final step...");
        
        try {
          const quickCopyBtn = await waitForElement('kat-button[id="katal_button_quick_copy"]', 10000);
          await clickWithRetry(quickCopyBtn, "Quick copy");
          console.log("🎉 AUTOMATION COMPLETED SUCCESSFULLY! ✅");
          updateProgress("🎉 COMPLETED! ✅");
          
          saveProgress(STEPS.COMPLETION, { 
            url: window.location.href,
            completedAt: new Date().toISOString()
          });
          
          // Clear progress after successful completion
          setTimeout(() => {
            clearProgress();
            progressIndicator.remove();
          }, 5000);
          
        } catch (error) {
          console.log("ℹ️ Quick copy not found - automation likely completed");
          updateProgress("✅ Automation completed");
          saveProgress(STEPS.COMPLETION);
        }
      } else {
        console.log("✅ All steps completed!");
        updateProgress("✅ All steps completed!");
      }

    } catch (error) {
      console.error("❌ Automation failed:", error);
      updateProgress(`❌ Failed: ${error.message}`);
      
      // Save error state
      const progress = getProgress();
      saveProgress(progress.step + '_error', { 
        error: error.message,
        timestamp: Date.now()
      });
      
      alert("❌ Automation failed: " + error.message + "\n\nProgress saved. You can resume later.");
    }
  }
  
  runSteps();
} 