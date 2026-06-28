/**
 * meetLinks.ts — Single source of truth for all Google Meet links.
 * Import from here instead of hardcoding links in individual components.
 */

export const MAIN_MEET_LINK = 'https://meet.google.com/uie-jxkt-vkx';
export const THURSDAY_PM_MEET_LINK = 'https://meet.google.com/dss-wmvy-cuq';
export const FRIDAY_MEET_LINK = 'https://meet.google.com/eeq-maem-ztc';

export type MeetingState = {
  label: string;
  link: string | null;
  message: string;
};

/** Returns the correct meeting link + label based on the current day/time. */
export function getMeetingState(
  now = new Date(),
  linkOverrides?: { main: string; thuPM: string; fri: string }
): MeetingState {
  const day = now.getDay();
  const hour = now.getHours();

  const mainLink = linkOverrides?.main || MAIN_MEET_LINK;
  const thuPMLink = linkOverrides?.thuPM || THURSDAY_PM_MEET_LINK;
  const friLink = linkOverrides?.fri || FRIDAY_MEET_LINK;

  if (day === 0 || day === 6)
    return { label: 'No meeting', link: null, message: 'No meeting on weekends.' };
  if (day === 5)
    return {
      label: 'Friday meet',
      link: friLink,
      message: 'Friday meeting link is active.',
    };
  if (day === 4 && hour >= 14)
    return {
      label: 'Thursday PM',
      link: thuPMLink,
      message: 'Thursday afternoon meeting link is active.',
    };

  return { label: 'Main meet', link: mainLink, message: 'Main meeting link is active.' };
}

export type MeetLinkItem = { label: string; link: string; days: string };

/** Ordered list used in CalendarPanel and the settings modal. */
export function getGoogleMeetLinks(overrides?: {
  main?: string;
  thuPM?: string;
  fri?: string;
}): MeetLinkItem[] {
  return [
    { label: 'Main meet (Mon–Thu AM)', link: overrides?.main?.trim() || MAIN_MEET_LINK, days: 'Mon–Thu' },
    { label: 'Thursday PM meet', link: overrides?.thuPM?.trim() || THURSDAY_PM_MEET_LINK, days: 'Thu PM' },
    { label: 'Friday meet', link: overrides?.fri?.trim() || FRIDAY_MEET_LINK, days: 'Fri' },
  ];
}

// Kept for backward compatibility
export const GOOGLE_MEET_LINKS = getGoogleMeetLinks();
