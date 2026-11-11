import { useContext } from 'react';
import { SmartHomeContext, SmartHomeContextValue } from '../contexts/SmartHomeContext';

export function useSmartHome(): SmartHomeContextValue {
  const ctx = useContext(SmartHomeContext);
  if (!ctx) {
    throw new Error('useSmartHome phải được sử dụng bên trong SmartHomeProvider');
  }
  return ctx;
}
