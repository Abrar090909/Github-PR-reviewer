import { covering, type Canvas } from "./bounds.js";
import { roundCoord, type Box } from "./geometry.js";

/**
 * Where everything a render drew ended up, in the viewBox units of the file
 * beside it.
 */
export type RenderAtlas = {
  lanes: Record<string, Box>;
  nodes: Record<string, Box>;
  edges: Record<string, Box>;
  /** Keyed by flow, then by step: a flow step's id is unique only inside its own flow. */
  messages: Record<string, Record<string, Box>>;
};

/** An atlas for a drawing that has placed nothing. */
export const emptyAtlas = (): RenderAtlas => ({ lanes: {}, nodes: {}, edges: {}, messages: {} });

export type AtlasEntry = { id: string; box: Box };

export const atlasBoxes = (
  entries: readonly AtlasEntry[],
  canvas: Canvas,
): Record<string, Box> => {
  const grown = new Map<string, Box>();
  for (const { id, box } of entries) {
    const current = grown.get(id);
    grown.set(id, current === undefined ? box : covering(current, box));
  }

  const boxes: Record<string, Box> = {};
  for (const [id, box] of grown)
    boxes[id] = {
      x: roundCoord(box.x + canvas.shiftX),
      y: roundCoord(box.y + canvas.shiftY),
      width: roundCoord(box.width),
      height: roundCoord(box.height),
    };
  return boxes;
};
