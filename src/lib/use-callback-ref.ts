import { useCallback, useEffect, useRef } from "react";

/**
 * Devuelve una función con identidad estable que siempre invoca la última
 * versión del callback. Útil para usar en dependencias de useEffect sin
 * provocar re-ejecuciones por cambio de identidad.
 */
export function useCallbackRef<Args extends unknown[], R>(
  callback: (...args: Args) => R,
): (...args: Args) => R {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
