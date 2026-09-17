/**
 * The measurements of the validated prototype, in one place. These are the
 * design system: change a number here and every diagram moves with it.
 * Ported from PR Lens renderer.
 */
export const DIAGRAM_MARGIN = 16;

export const LANE_TOP = 44;
export const LANE_HEADER_BASELINE = 68;
export const LANE_PADDING_X = 16;
export const LANE_GAP = 20;
export const LANE_BOTTOM_PADDING = 20;

/**
 * Every lane is the same width, and that width is a constant rather than
 * anything derived from what the lanes hold.
 */
export const LANE_CONTENT_WIDTH = 372;
export const LANE_RADIUS = 12;
export const LANE_LABEL_SIZE = 10;
export const LANE_LABEL_TRACKING = 0.12;

export const CONTENT_TOP = 92;
export const ROW_GAP = 52;

export const CARD_RADIUS = 10;
export const CARD_GAP_X = 12;
export const CARD_HEIGHT = 52;
export const CARD_HEIGHT_WITH_SUBTITLE = 62;
export const CARD_PADDING_X = 14;

export const ICON_CHIP_SIZE = 26;
export const ICON_CHIP_GAP = 10;
export const ICON_CHIP_RADIUS = 7;
/** Below this a card's title starts a size down, to keep its room. */
export const ICON_MIN_CARD_WIDTH = 200;

export const TITLE_SIZE = 13;
export const TITLE_SIZE_SMALL = 11.5;

export const TITLE_SIZE_MIN = 10.5;
export const TITLE_SIZE_STEP = 0.5;

export const SUBTITLE_SIZE = 9.5;

export const BADGE_HEIGHT = 16;
export const BADGE_PADDING_X = 9;
export const BADGE_TEXT_SIZE = 8.5;
export const BADGE_TRACKING = 0.06;
export const BADGE_GAP = 6;
export const BADGE_RADIUS = 8;
/** How far the badge row rides above the top edge of the card it labels. */
export const BADGE_RISE = 8;

export const PILL_HEIGHT = 15;
export const PILL_PADDING_X = 8;
export const PILL_TEXT_SIZE = 9.5;
/** Two label pills never sit closer than this, in either direction. */
export const PILL_CLEARANCE = 2;

export const TRACK_CLEARANCE = 6;
export const TRACK_PITCH_MAX = 16;
export const TRACK_PITCH_MIN = 10;

/** Step between neighbouring arrow ports along one card face. */
export const PORT_PITCH = 16;
/** Ports keep clear of the card's rounded corners. */
export const PORT_INSET = 14;

export const BEND_RADIUS_MAX = 34;

/** One turn of the travelling pulse, and of the staggered train. */
export const PULSE_DURATION = 1.6;
export const HERO_PULSE_DURATION = 2.1;
export const HERO_PULSE_COUNT = 3;

export const FLOW_STEP_TRAVEL = 1.4;
export const FLOW_CYCLE_MAX = 16;
/** How much of its own slot a pulse spends fading in, and again fading out. */
export const FLOW_PULSE_RAMP = 0.08;
/** More repeats than this and the arrows stop reading as separate calls. */
export const FLOW_MAX_PULSES_PER_MESSAGE = 3;
