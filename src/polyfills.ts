// Polyfills MUST be imported before any other code
// This file should be imported as the FIRST import in App.tsx

// URL polyfill for Clerk SDK and other libraries
import 'react-native-url-polyfill/auto';

// Buffer polyfill for base64 operations
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

// Browser global stubs that Clerk might need
if (typeof global.window === 'undefined') {
  (global as any).window = global;
}
if (typeof global.document === 'undefined') {
  (global as any).document = {
    baseURI: 'http://localhost',
    createElement: () => ({}),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
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

console.log('Polyfills loaded successfully');
