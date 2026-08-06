/** Virtual scrolling list — renders only visible items for performance.
 * Suitable for large lists in terminal UI environments.
 */
import { useState, useEffect, useMemo } from 'react';

/** Compute which items are visible given container height and item height. */
function useVirtualizer({ items, itemHeight, containerHeight, overscan = 2 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const offsetY = startIndex * itemHeight;
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return {
    startIndex,
    endIndex,
    visibleItems,
    offsetY,
    totalHeight,
    setScrollTop,
  };
}

/** VirtualList — renders only visible rows from a large list.
 *
 * Props:
 *   items: array of data items
 *   itemHeight: height per item (number)
 *   height: visible container height (number)
 *   renderItem: (item, index) => JSX
 */
export function VirtualList({ items, itemHeight = 1, height = 20, renderItem, onScroll }) {
  const {
    visibleItems,
    offsetY,
    totalHeight,
    setScrollTop,
  } = useVirtualizer({ items, itemHeight, containerHeight: height });

  const handleScroll = (dir) => (e) => {
    if (e.type === 'wheel' || e.type === 'mouse') {
      const delta = e.button === 1 ? -itemHeight : itemHeight;
      setScrollTop((prev) => Math.max(0, Math.min(totalHeight - height, prev + delta)));
    }
  };

  useEffect(() => {
    onScroll?.({ scrollTop: offsetY / itemHeight, itemCount: visibleItems.length });
  }, [offsetY, visibleItems, onScroll, itemHeight]);

  // Placeholder spacer + visible items
  return (
    <box
      height={height}
      flexDirection="column"
      overflow="hidden"
      onMouseDown={handleScroll('mouse')}
      onWheel={handleScroll('wheel')}
    >
      <box height={1} />
      {visibleItems.map((item, i) => {
        const realIndex = Math.floor(offsetY / itemHeight) + i;
        return (
          <box key={item?.id || realIndex} flexDirection="row">
            {renderItem(item, realIndex)}
          </box>
        );
      })}
      <box height={Math.floor((totalHeight - offsetY - visibleItems.length * itemHeight) / itemHeight)} />
    </box>
  );
}
