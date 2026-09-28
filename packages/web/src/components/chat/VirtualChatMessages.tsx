"use client";

// WEB-005: virtualized message list — only the rows inside the viewport are
// mounted, so god-mode/test-mode sessions with thousands of stream updates no
// longer balloon the DOM past ~15k nodes. Rows are measured with a
// ResizeObserver and re-measured on content growth (streaming), keeping the
// list scroll position stable while new chunks arrive.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../types/chat";

const ESTIMATED_ROW_HEIGHT = 140;
const OVERSCAN_COUNT = 6;

interface VirtualChatMessagesProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  size?: "sm" | "md";
  isNormalChat?: boolean;
  undo?: any;
}

interface RowData {
  messages: ChatMessageType[];
  isStreaming: boolean;
  size: "sm" | "md";
  isNormalChat: boolean;
  undo?: any;
  onMeasure: (index: number, height: number) => void;
}

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const { messages, isStreaming, size, isNormalChat, undo, onMeasure } = data;
  const msg = messages[index];
  const measureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const report = () => onMeasure(index, el.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, onMeasure, msg]);

  const prevMsg = index > 0 ? messages[index - 1] : null;
  const showAvatar =
    msg.role === "assistant" &&
    msg.kind !== "tool" &&
    (!prevMsg || prevMsg.role !== "assistant" || prevMsg.kind === "tool");

  return (
    <div style={style}>
      <div ref={measureRef} className="pb-6">
        <ChatMessage
          msg={msg}
          idx={index}
          size={size}
          isStreaming={isStreaming && index === messages.length - 1}
          undo={undo}
          isNormalChat={isNormalChat}
          showAvatar={showAvatar}
        />
      </div>
    </div>
  );
}

export function VirtualChatMessages({
  messages,
  isStreaming,
  size = "md",
  isNormalChat = false,
  undo,
}: VirtualChatMessagesProps) {
  const listRef = useRef<VariableSizeList>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sizeMap = useRef<Record<number, number>>({});
  const [viewportHeight, setViewportHeight] = useState(0);

  // Measure the viewport so the list gets a real pixel height (it cannot
  // size itself from flexbox).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onMeasure = useCallback((index: number, height: number) => {
    if (sizeMap.current[index] !== height) {
      sizeMap.current[index] = height;
      listRef.current?.resetAfterIndex(Math.max(0, index - 1), true);
    }
  }, []);

  const itemSize = useCallback(
    (index: number) => sizeMap.current[index] ?? ESTIMATED_ROW_HEIGHT,
    []
  );

  // Auto-scroll to the newest message when one is appended or a stream
  // starts — mirrors the previous scrollIntoView sentinel behavior.
  const countRef = useRef(messages.length);
  useEffect(() => {
    const prevCount = countRef.current;
    countRef.current = messages.length;
    if (messages.length > prevCount && messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToItem(messages.length - 1, "end");
      });
    }
  }, [messages.length]);

  const streamingRef = useRef(isStreaming);
  useEffect(() => {
    const wasStreaming = streamingRef.current;
    streamingRef.current = isStreaming;
    if (isStreaming && !wasStreaming && messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToItem(messages.length - 1, "end");
      });
    }
  }, [isStreaming, messages.length]);

  const itemData: RowData = {
    messages,
    isStreaming,
    size,
    isNormalChat,
    undo,
    onMeasure,
  };

  return (
    <div ref={containerRef} className="flex-1 min-h-0 w-full">
      {viewportHeight > 0 && (
        <VariableSizeList
          ref={listRef}
          height={viewportHeight}
          width="100%"
          itemCount={messages.length}
          itemSize={itemSize}
          itemData={itemData}
          itemKey={(index: number, data: RowData) =>
            data.messages[index]?.id ?? `msg-${index}`
          }
          overscanCount={OVERSCAN_COUNT}
          estimatedItemSize={ESTIMATED_ROW_HEIGHT}
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
}

export default VirtualChatMessages;
