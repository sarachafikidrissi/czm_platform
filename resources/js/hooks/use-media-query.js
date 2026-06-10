// resources/js/hooks/use-media-query.js
import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query.
 * @example const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
