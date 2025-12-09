import React from 'react';
import { Requests } from './Requests';

// For simplicity, My NDAs uses the same view as Requests
// In a real application, this would filter to show only user's assigned NDAs
export function MyNDAs() {
  return <Requests />;
}
