/**
 * Type declarations for `react-window` **1.8.x** (the package ships no bundled
 * types — `@types/react-window` does not exist for 1.x).
 *
 * WHY THIS FILE MUST STAY (audit WEB-013)
 * --------------------------------------
 * `react-window` used to be an **undeclared** dependency: nothing in
 * `packages/web/package.json` asked for it, and it only resolved because
 * `react-arborist` hoisted 1.8.11 into the root `node_modules`. That is a
 * phantom dependency — `npm ci` in a pruned CI/Docker context would have left
 * the chat list (the most important view) unable to resolve its own import.
 *
 * It is now declared explicitly in `packages/web/package.json` as
 * `"react-window": "^1.8.11"`, which matches the 1.x API used by
 * `VirtualChatMessages.tsx` (`VariableSizeList`, `itemSize` as a callback,
 * `estimatedItemSize`, `overscanCount`).
 *
 * ⚠️ These declarations describe the **1.x** API. If the dependency is ever
 * bumped to 2.x, this shim will happily describe an API that no longer exists
 * and the break will only show up at runtime — that is the landmine this
 * comment exists to flag. (The unused `@tanstack/react-virtual` dependency was
 * removed in the same pass; it was declared but imported nowhere.)
 */
declare module "react-window" {
  import * as React from "react";

  export type ScrollToAlign = "auto" | "smart" | "center" | "end" | "start";

  export type ListChildComponentProps<T = any> = {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
  };

  export type ListOnScrollProps = {
    scrollOffset: number;
    scrollDirection: "backward" | "forward";
    scrollUpdateWasRequested: boolean;
  };

  export type ListOnItemsRenderedProps = {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  };

  export type VariableSizeListProps = {
    children: React.ComponentType<ListChildComponentProps>;
    className?: string;
    height: number | string;
    width: number | string;
    itemCount: number;
    itemData?: any;
    itemKey?: (index: number, data: any) => any;
    itemSize: (index: number) => number;
    estimatedItemSize?: number;
    overscanCount?: number;
    initialScrollOffset?: number;
    layout?: "vertical" | "horizontal";
    direction?: "ltr" | "rtl";
    useIsScrolling?: boolean;
    style?: React.CSSProperties;
    innerRef?: React.Ref<any>;
    outerRef?: React.Ref<any>;
    onScroll?: (props: ListOnScrollProps) => void;
    onItemsRendered?: (props: ListOnItemsRenderedProps) => void;
  };

  export class VariableSizeList extends React.Component<VariableSizeListProps> {
    scrollToItem(index: number, align?: ScrollToAlign): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }
}
