import * as React from 'react';
import { UnifiedAuthScreen } from './login';

export default function RegisterScreen(): React.JSX.Element {
  return <UnifiedAuthScreen initialMode="register" />;
}
