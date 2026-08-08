/**
 * Agricultural calendar: when can a parcel be prospected given its crop?
 *
 * Prospecting is possible during specific windows:
 * - After harvest (straw/stubble stage)
 * - After ploughing (fresh labour)
 * - Before sowing
 *
 * This module manages crop types and their access windows, editable via config.
 * RPG (Registre Parcellaire Graphique) data will be integrated in T3.1.
 *
 * Reference: PLAN.md §4.3, §9.3
 */

export type CropType =
  | 'cereales_hiver' // winter cereals (wheat, barley)
  | 'mais'            // corn (maize)
  | 'tournesol'       // sunflower
  | 'prairie'         // meadow / permanent grass
  | 'inconnu';        // unknown crop

export interface AccessWindow {
  /** Start month (1-12) */
  startMonth: number;
  /** End month (1-12) */
  endMonth: number;
  /** Human-readable reason */
  reason: string;
  /** Whether prospecting is allowed in this window */
  prospectable: boolean;
}

/**
 * Agricultural calendar: one entry per crop type.
 * Defines when the parcel is accessible for prospecting.
 */
export interface AgriculturalCalendar {
  cropType: CropType;
  windows: AccessWindow[];
}

/**
 * Default calendars by crop type.
 * These are editable — see loadCalendarConfig().
 *
 * Reference: French agricultural practices
 * - Winter cereals: sown Sept-Nov, harvested June-July
 * - Corn: sown April-May, harvested Sept-Oct
 * - Sunflower: sown April-May, harvested Sept-Oct
 * - Meadow: can be grazed year-round, but prospecting best after mowing
 */
const DEFAULT_CALENDARS: Record<CropType, AgriculturalCalendar> = {
  cereales_hiver: {
    cropType: 'cereales_hiver',
    windows: [
      { startMonth: 7, endMonth: 10, reason: 'après moisson (chaume)', prospectable: true },
      { startMonth: 11, endMonth: 3, reason: 'après labour/semis en cours', prospectable: false },
      { startMonth: 4, endMonth: 6, reason: 'blé sur pied', prospectable: false },
    ],
  },
  mais: {
    cropType: 'mais',
    windows: [
      { startMonth: 1, endMonth: 3, reason: 'labour/chaume hiver', prospectable: true },
      { startMonth: 4, endMonth: 8, reason: 'maïs sur pied', prospectable: false },
      { startMonth: 9, endMonth: 11, reason: 'après récolte', prospectable: true },
      { startMonth: 12, endMonth: 12, reason: 'labour automne', prospectable: true },
    ],
  },
  tournesol: {
    cropType: 'tournesol',
    windows: [
      { startMonth: 1, endMonth: 3, reason: 'labour hiver', prospectable: true },
      { startMonth: 4, endMonth: 8, reason: 'tournesol sur pied', prospectable: false },
      { startMonth: 9, endMonth: 11, reason: 'après récolte', prospectable: true },
      { startMonth: 12, endMonth: 12, reason: 'labour automne', prospectable: true },
    ],
  },
  prairie: {
    cropType: 'prairie',
    windows: [
      { startMonth: 1, endMonth: 12, reason: 'prairie: prospectable toute l\'année (meilleure après fauche)', prospectable: true },
    ],
  },
  inconnu: {
    cropType: 'inconnu',
    windows: [
      { startMonth: 1, endMonth: 12, reason: 'culture inconnue: à vérifier sur le terrain', prospectable: true },
    ],
  },
};

/**
 * Check if a parcel with a given crop is prospectable during the given month.
 *
 * @param cropType crop type (or 'inconnu' if unknown)
 * @param month month (1-12)
 * @returns { prospectable, reason }
 */
export function checkAccessibility(
  cropType: CropType = 'inconnu',
  month: number
): { prospectable: boolean; reason: string } {
  const calendar = DEFAULT_CALENDARS[cropType];
  if (!calendar) {
    return { prospectable: true, reason: 'Type de culture inconnue, à vérifier sur terrain' };
  }

  for (const window of calendar.windows) {
    // Handle windows that wrap year boundary (e.g., startMonth > endMonth)
    const inWindow =
      window.startMonth <= window.endMonth
        ? month >= window.startMonth && month <= window.endMonth
        : month >= window.startMonth || month <= window.endMonth;

    if (inWindow) {
      return { prospectable: window.prospectable, reason: window.reason };
    }
  }

  // Fallback (should not happen if calendar is complete)
  return { prospectable: false, reason: 'Hors fenêtre d\'accès' };
}

/**
 * Get all windows for a crop type.
 */
export function getCalendar(cropType: CropType = 'inconnu'): AgriculturalCalendar {
  return DEFAULT_CALENDARS[cropType] || DEFAULT_CALENDARS.inconnu;
}

/**
 * Get current month accessibility for a crop type.
 * @param cropType crop type
 * @param date current date (default = today)
 */
export function isProspectableNow(cropType: CropType = 'inconnu', date = new Date()): boolean {
  const month = date.getMonth() + 1; // getMonth is 0-indexed
  const { prospectable } = checkAccessibility(cropType, month);
  return prospectable;
}

/**
 * Get a list of the best prospecting months for a crop.
 */
export function getBestMonths(cropType: CropType = 'inconnu'): number[] {
  const calendar = getCalendar(cropType);
  const best: number[] = [];

  for (const window of calendar.windows) {
    if (!window.prospectable) continue;

    if (window.startMonth <= window.endMonth) {
      for (let m = window.startMonth; m <= window.endMonth; m++) {
        best.push(m);
      }
    } else {
      // Wrap around year
      for (let m = window.startMonth; m <= 12; m++) {
        best.push(m);
      }
      for (let m = 1; m <= window.endMonth; m++) {
        best.push(m);
      }
    }
  }

  return [...new Set(best)].sort((a, b) => a - b);
}

/**
 * Generate a next prospectable window for a crop (in future months).
 * @param cropType crop type
 * @param startMonth starting month to search from (default = current month)
 * @returns { startMonth, endMonth, reason } or null if no window found
 */
export function getNextProspectableWindow(
  cropType: CropType = 'inconnu',
  startMonth?: number
): { startMonth: number; endMonth: number; reason: string } | null {
  if (!startMonth) {
    startMonth = new Date().getMonth() + 1;
  }

  const calendar = getCalendar(cropType);

  // Search up to 24 months in the future
  for (let i = 0; i < 24; i++) {
    const testMonth = ((startMonth + i - 1) % 12) + 1;
    const { prospectable } = checkAccessibility(cropType, testMonth);

    if (prospectable) {
      // Found a prospectable month; find the full window
      const window = calendar.windows.find((w) => {
        const inWindow =
          w.startMonth <= w.endMonth
            ? testMonth >= w.startMonth && testMonth <= w.endMonth
            : testMonth >= w.startMonth || testMonth <= w.endMonth;
        return inWindow && w.prospectable;
      });

      if (window) {
        return {
          startMonth: window.startMonth,
          endMonth: window.endMonth,
          reason: window.reason,
        };
      }
    }
  }

  return null;
}

export interface OutingWindowStatus {
  /** one of: 'now', 'soon', 'out_of_season' */
  status: 'now' | 'soon' | 'out_of_season';
  /** human-readable reason in one sentence */
  reason: string;
  /** next prospectable window if status is 'out_of_season' */
  nextWindow?: { startMonth: number; endMonth: number };
}

/**
 * Determine if a parcel is prospectable NOW given its crop type.
 * This feeds into the overall outing window decision (§1.6).
 *
 * @param cropType crop type
 * @param date current date (default = today)
 * @returns status and reason
 */
export function assessCalendarStatus(cropType: CropType = 'inconnu', date = new Date()): OutingWindowStatus {
  const month = date.getMonth() + 1;
  const { prospectable, reason } = checkAccessibility(cropType, month);

  if (prospectable) {
    return {
      status: 'now',
      reason,
    };
  }

  // Not now; find the next window
  const next = getNextProspectableWindow(cropType, month + 1);
  if (next) {
    return {
      status: 'soon',
      reason: `Hors saison. ${reason}. Prochaine fenêtre: mois ${next.startMonth}-${next.endMonth}`,
      nextWindow: { startMonth: next.startMonth, endMonth: next.endMonth },
    };
  }

  return {
    status: 'out_of_season',
    reason: `Hors saison toute l'année pour culture '${cropType}'`,
  };
}

/**
 * Locale-aware month name for UI display.
 */
export function getMonthName(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return months[(month - 1) % 12] || 'Mois inconnu';
}
