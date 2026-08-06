import React, { useState, useEffect } from 'react';
import { useKeyboard } from '@opentui/react';
import { theme } from './theme.js';

export function SelectModal({ title, options, onSelect, onClose, placeholder = 'Search' }) {
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(0);

  // Group options by category
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.value && String(o.value).toLowerCase().includes(search.toLowerCase()))
  );

  const categories = [...new Set(filtered.map(o => o.category || 'Items'))];
  
  // Flatten list for cursor navigation
  const flatList = [];
  for (const cat of categories) {
    flatList.push({ isCategory: true, label: cat });
    flatList.push(...filtered.filter(o => (o.category || 'Items') === cat).map(o => ({ ...o, isCategory: false })));
  }

  // Find valid selectable indexes
  const selectableIndexes = flatList.map((item, idx) => item.isCategory ? -1 : idx).filter(i => i !== -1);
  
  const currentCursorIndex = selectableIndexes.length > 0 ? (cursor >= selectableIndexes.length ? selectableIndexes.length - 1 : cursor) : 0;
  const currentFlatIndex = selectableIndexes[currentCursorIndex];

  useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
    if ((key.name === "escape")) {
      onClose();
      return;
    }
    
    if ((key.name === "up")) {
      setCursor(c => Math.max(0, c - 1));
      return;
    }
    
    if ((key.name === "down")) {
      if (key.shift) {
        setCursor(c => Math.max(0, c - 1));
        return;
      }
      setCursor(c => Math.min(selectableIndexes.length - 1, c + 1));
      return;
    }
    
    if ((key.name === "return")) {
      if (selectableIndexes.length > 0) {
        onSelect(flatList[currentFlatIndex]);
      }
      return;
    }
    
    if ((key.name === "backspace") || (key.name === "delete")) {
      setSearch(s => s.slice(0, -1));
      setCursor(0);
      return;
    }
    
    
    // Normal character input or pasted text, avoiding ANSI escapes
    if (input && !input.includes('\u001b') && !key.ctrl && !key.meta) {
      setSearch(s => s + input);
      setCursor(0);
    }
  });

  // Calculate sliding window for scroll (max 10 items)
  const maxItems = 10;
  let startIdx = 0;
  if (flatList.length > maxItems) {
    startIdx = Math.max(0, currentFlatIndex - Math.floor(maxItems / 2));
    if (startIdx + maxItems > flatList.length) {
      startIdx = flatList.length - maxItems;
    }
  }
  
  const visibleList = flatList.slice(startIdx, startIdx + maxItems);

  return (
    <box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
      <box 
        width={70} 
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.green}
        backgroundColor={theme.panel}
        paddingLeft={1} paddingRight={1}
        paddingTop={1} paddingBottom={1}
      >
        <box justifyContent="space-between" marginBottom={1}>
        <text bold>{title}</text>
        <text fg="gray">esc</text>
      </box>

      <box marginBottom={1}>
        {search.length === 0 ? (
          <text fg={theme.gray}>
            <text fg={theme.green}>{placeholder.charAt(0)}</text>
            {placeholder.slice(1)}
          </text>
        ) : (
          <text>{search}<text fg={theme.green}>█</text></text>
        )}
      </box>

      <box flexDirection="column">
        {visibleList.length === 0 ? (
          <text fg="gray">  No results found.</text>
        ) : (
          visibleList.map((item, idx) => {
            const actualIdx = startIdx + idx;
            if (item.isCategory) {
              return <box key={`cat-${actualIdx}`} marginTop={idx === 0 ? 0 : 1}>
                <text fg={theme.blue} bold>{item.label}</text>
              </box>;
            }
            const isSelected = actualIdx === currentFlatIndex;
            return (
              <box 
                key={`item-${actualIdx}`} 
                backgroundColor={isSelected ? theme.green : undefined} 
                paddingLeft={1} paddingRight={1}
                width="100%"
              >
                <text fg={isSelected ? 'black' : theme.text}>
                  {item.label}
                  {item.hint && <text fg={isSelected ? '#14532d' : theme.dim}> {item.hint}</text>}
                </text>
              </box>
            );
          })
        )}
      </box>
    </box>
    </box>
  );
}
