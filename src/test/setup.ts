import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(()=>{cleanup();localStorage.clear();location.hash='';});
Element.prototype.scrollIntoView=()=>{};
