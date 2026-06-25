/**
 * Hindi labels for "Other" work options — cache-first, then API for missing strings.
 */

import { useCallback, useEffect, useState } from 'react';
import { ensureHindiTranslations } from '../utils/translate';
import { OTHER_WORK_OPTIONS } from '../constants/otherWorkOptions';

export function useOtherWorkHindiTranslations(locale, { enabled = true, priorityTexts = [] } = {}) {
  const [otherTranslated, setOtherTranslated] = useState({});

  useEffect(() => {
    if (!enabled || locale !== 'hi') {
      setOtherTranslated({});
      return undefined;
    }

    let cancelled = false;

    (async () => {
      await ensureHindiTranslations(OTHER_WORK_OPTIONS, {
        priorityTexts,
        onPartial: (partial) => {
          if (cancelled || !partial || Object.keys(partial).length === 0) return;
          setOtherTranslated((prev) => ({ ...prev, ...partial }));
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, enabled, priorityTexts.join('|')]);

  const labelForOtherWork = useCallback(
    (en) => {
      const s = String(en || '').trim();
      if (!s) return en;
      if (locale !== 'hi') return s;
      return otherTranslated[s] || s;
    },
    [locale, otherTranslated]
  );

  return { otherTranslated, labelForOtherWork };
}
