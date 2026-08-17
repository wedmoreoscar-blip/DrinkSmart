/**
 * Where a dragged timeline row lands, and where the drop line marking that goes.
 *
 * dnd-kit's `verticalListSortingStrategy` previews a reorder purely from the
 * active and `over` indices: the moment collision detection names a neighbour,
 * that neighbour slides out of the way and the list already shows the finished
 * order. Committing on a *different* rule than the one the preview drew is what
 * made a drop look rejected. `closestCorners` names a neighbour as soon as the
 * tiles meaningfully overlap, but the commit demanded the dragged row's
 * midpoint pass the neighbour's midpoint — so releasing anywhere in between
 * reverted a swap the user had already watched happen, and the row sprang back
 * up the list.
 *
 * The fix is not a better midpoint test. It is that there must be one rule: the
 * row lands where the preview put it, at `overIndex`.
 */

/** The index the dragged row commits to, or null when the drop is refused. */
export function timelineDropIndex(input: {
  fromIndex: number;
  overIndex: number;
  /** Rows before this one are in the past and cannot be dropped onto. */
  firstMovableIndex: number;
}): number | null {
  const { fromIndex, overIndex, firstMovableIndex } = input;
  if (fromIndex < 0 || overIndex < 0) return null;
  // A drink cannot be dropped before now: past rows refuse the drop.
  if (overIndex < firstMovableIndex) return null;
  if (overIndex === fromIndex) return null;
  return overIndex;
}

/**
 * The y of the drop line, in the same coordinate space as the row's `offsetTop`.
 *
 * Layout offsets are used deliberately: the preview moves rows with CSS
 * transforms, which leaves `offsetTop` describing the slots rather than the
 * shifted tiles. Dragging down, the `over` row has slid up out of the slot
 * ending at its own layout bottom; dragging up, it has slid down out of the
 * slot beginning at its layout top. Either way the vacated slot is the one the
 * dragged row is about to fill, so the line lands on its near edge.
 */
export function timelineDropLineY(input: {
  fromIndex: number;
  overIndex: number;
  rowTop: number;
  rowHeight: number;
}): number {
  const movingDown = input.overIndex > input.fromIndex;
  return input.rowTop + (movingDown ? input.rowHeight : 0);
}
