/**
 * Shared UI utilities for MSDF Text Toolkit
 * Provides common UI interaction patterns
 */

/**
 * Sync a color picker with a text input
 * @param {HTMLInputElement} colorPicker - Color picker element
 * @param {HTMLInputElement} textInput - Text input element
 * @param {Function} onChange - Callback when color changes
 */
export function syncColorInputs(colorPicker, textInput, onChange) {
  colorPicker.addEventListener('input', (e) => {
    textInput.value = e.target.value;
    if (onChange) onChange(e.target.value);
  });
  
  textInput.addEventListener('input', (e) => {
    colorPicker.value = e.target.value;
    if (onChange) onChange(e.target.value);
  });
}

/**
 * Sync a range slider with a value display element
 * @param {HTMLInputElement} slider - Range slider element
 * @param {HTMLElement} valueDisplay - Element to display value
 * @param {Function} onChange - Callback when value changes
 * @param {Object} options - {decimals: 2, prefix: '', suffix: ''}
 */
export function syncSliderValue(slider, valueDisplay, onChange, options = {}) {
  const { decimals = 2, prefix = '', suffix = '' } = options;
  
  const updateDisplay = (value) => {
    const num = parseFloat(value);
    valueDisplay.textContent = prefix + num.toFixed(decimals) + suffix;
  };
  
  // Initialize display
  updateDisplay(slider.value);
  
  slider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    updateDisplay(value);
    if (onChange) onChange(value);
  });
  
  return {
    setValue: (value) => {
      slider.value = value;
      updateDisplay(value);
    },
    getValue: () => parseFloat(slider.value)
  };
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (#rrggbb)
 * @returns {{r: number, g: number, b: number}} RGB values 0-255
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red 0-255
 * @param {number} g - Green 0-255
 * @param {number} b - Blue 0-255
 * @returns {string} Hex color string
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Create a simple status/notification system
 * @param {HTMLElement} container - Container for messages
 * @param {number} timeout - Auto-hide timeout in ms (0 = no auto-hide)
 */
export function createNotifier(container, timeout = 3000) {
  return {
    show(message, type = 'info') {
      container.textContent = message;
      container.className = `status status-${type}`;
      container.classList.remove('hidden');
      
      if (timeout > 0) {
        setTimeout(() => {
          container.classList.add('hidden');
        }, timeout);
      }
    },
    hide() {
      container.classList.add('hidden');
    }
  };
}

/**
 * Create a simple logger
 * @param {HTMLElement} container - Container for log messages
 * @param {number} maxMessages - Maximum number of messages to keep
 */
export function createLogger(container, maxMessages = 100) {
  const messages = [];
  
  return {
    log(message, level = 'info') {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = { timestamp, message, level };
      messages.push(logEntry);
      
      if (messages.length > maxMessages) {
        messages.shift();
      }
      
      // Append to container
      const div = document.createElement('div');
      div.className = `log-entry log-${level}`;
      div.textContent = `[${timestamp}] ${message}`;
      container.appendChild(div);
      
      // Auto-scroll to bottom
      container.scrollTop = container.scrollHeight;
    },
    clear() {
      messages.length = 0;
      container.innerHTML = '';
    },
    getMessages() {
      return [...messages];
    }
  };
}

/**
 * File upload helper with drag-and-drop support
 * @param {HTMLInputElement} fileInput - File input element
 * @param {HTMLElement} dropZone - Drop zone element (optional)
 * @param {Function} onFileSelect - Callback when file is selected
 */
export function setupFileUpload(fileInput, dropZone, onFileSelect) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  });
  
  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });
    
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && onFileSelect) {
        onFileSelect(files[0]);
      }
    });
  }
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

