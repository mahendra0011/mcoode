// Minimal type declarations for react-window 1.8.x (the package ships no
// bundled types). Only the pieces the codebase uses are declared.
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
