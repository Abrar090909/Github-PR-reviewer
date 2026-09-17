import { HERO_PULSE_DURATION, PULSE_DURATION } from "../design.js";
import { coord } from "../geometry.js";
import { lines, tag, wrap } from "./primitives.js";

/** The dot itself, so both lenses draw the same mark whatever clock moves it. */
export const PULSE_RADIUS = 2.6;
export const TRAIN_RADIUS = 3;

/**
 * The travelling pulse: the mark that says a connection carries traffic
 * rather than merely existing. Uses SVG animateMotion to ride a dot along
 * an arbitrary path at a fixed speed, looping indefinitely.
 */
export const travellingPulses = (pulse: {
  path: string;
  colour: string;
  /** Dots riding this line at once, spread evenly around the turn. */
  count: number;
  /** How far this line runs behind the drawing's clock, in seconds. */
  lag: number;
}): string => {
  const { path, colour, count, lag } = pulse;
  const train = count > 1;
  const duration = train ? HERO_PULSE_DURATION : PULSE_DURATION;

  return lines(
    Array.from({ length: count }, (_, index) => {
      const behind = (lag + (duration / count) * index) % duration;
      return wrap(
        "circle",
        { r: train ? TRAIN_RADIUS : PULSE_RADIUS, fill: colour },
        tag("animateMotion", {
          dur: `${coord(duration)}s`,
          begin: behind === 0 ? undefined : `${coord(behind - duration)}s`,
          repeatCount: "indefinite",
          path,
        }),
      );
    }),
  );
};
