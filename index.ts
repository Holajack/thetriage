// URL polyfill MUST be imported first, before any other imports
// This is required for @clerk/clerk-expo and other libraries that use URL API
import 'react-native-url-polyfill/auto';

// Buffer polyfill for base64 operations (needed by Clerk SDK)
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
}

// atob/btoa polyfills for base64 encoding (needed by Clerk SDK)
if (typeof global.atob === 'undefined') {
  (global as any).atob = (data: string): string => {
    return Buffer.from(data, 'base64').toString('binary');
  };
}
if (typeof global.btoa === 'undefined') {
  (global as any).btoa = (data: string): string => {
    return Buffer.from(data, 'binary').toString('base64');
  };
}

// Add browser global stubs that Clerk might need
// Clerk SDK may check for browser-specific globals during initialization
if (typeof global.window === 'undefined') {
  (global as any).window = {
    ...global,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
} else {
  // Window exists but might be missing dispatchEvent
  if (typeof (global as any).window.dispatchEvent !== 'function') {
    (global as any).window.dispatchEvent = () => true;
  }
  if (typeof (global as any).window.addEventListener !== 'function') {
    (global as any).window.addEventListener = () => {};
  }
  if (typeof (global as any).window.removeEventListener !== 'function') {
    (global as any).window.removeEventListener = () => {};
  }
}

// CustomEvent polyfill for Clerk SDK (used for internal event dispatching)
if (typeof (global as any).CustomEvent === 'undefined') {
  (global as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    bubbles: boolean;
    cancelable: boolean;
    constructor(type: string, params?: { bubbles?: boolean; cancelable?: boolean; detail?: any }) {
      this.type = type;
      this.detail = params?.detail;
      this.bubbles = params?.bubbles ?? false;
      this.cancelable = params?.cancelable ?? false;
    }
  };
}
if (typeof global.document === 'undefined') {
  (global as any).document = {
    baseURI: 'http://localhost',
    createElement: () => ({}),
    querySelector: () => null,
    querySelectorAll: () => [],
    hasFocus: () => true, // Clerk SDK calls this - return true for RN
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
} else {
  // Document exists but might be missing hasFocus
  if (typeof (global as any).document.hasFocus !== 'function') {
    (global as any).document.hasFocus = () => true;
  }
}
if (typeof global.navigator === 'undefined') {
  (global as any).navigator = {
    userAgent: 'ReactNative',
    product: 'ReactNative',
  };
}
if (typeof global.location === 'undefined') {
  (global as any).location = {
    href: 'http://localhost',
    origin: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    pathname: '/',
    search: '',
    hash: '',
  };
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
