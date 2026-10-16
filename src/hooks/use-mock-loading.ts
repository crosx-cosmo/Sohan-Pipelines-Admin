/** Data is loaded once after sign-in (see AuthGate), so pages render immediately. */
export function useMockLoading(_delay = 0) {
  return false;
}
