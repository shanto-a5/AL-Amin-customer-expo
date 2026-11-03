/**
 * Bottom clearance contract for the integrated bottom navigation bar.
 *
 * Publishes the exact height + safe-area inset + comfortable scroll breathing
 * room so every `Screen` inside the authenticated shell scrolls its final item
 * cleanly into view without being obscured by `BottomNavigation`.
 */
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the compact integrated bottom navigation bar (excluding safe-area inset). */
export const CUSTOMER_DOCK_HEIGHT = 64;

/** Integrated bottom bar sits flush at the bottom edge. */
export const CUSTOMER_DOCK_BOTTOM_GAP = 0;

/** Extra scroll breathing room above the bottom bar. */
const SCROLL_BREATHING_SPACE = 24;

const CustomerDockClearanceContext = React.createContext<number | null>(null);

export function CustomerDockClearanceProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const clearance = CUSTOMER_DOCK_HEIGHT + insets.bottom + SCROLL_BREATHING_SPACE;

  return (
    <CustomerDockClearanceContext.Provider value={clearance}>
      {children}
    </CustomerDockClearanceContext.Provider>
  );
}

export function useCustomerDockClearance(): number | null {
  return React.useContext(CustomerDockClearanceContext);
}
