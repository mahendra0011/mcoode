import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
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

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1));
      return;
    }
    
    if (key.downArrow) {
      if (key.shift) {
        setCursor(c => Math.max(0, c - 1));
        return;
      }
      setCursor(c => Math.min(selectableIndexes.length - 1, c + 1));
      return;
    }
    
    if (key.return) {
      if (selectableIndexes.length > 0) {
        onSelect(flatList[currentFlatIndex]);
      }
      return;
    }
    
    if (key.backspace || key.delete) {
      setSearch(s => s.slice(0, -1));
      setCursor(0);
      return;
    }
    
    
    // Normal character input or pasted text, avoiding ANSI escapes
    if (input && !input.includes('\u001b') && !key.ctrl && !key.meta) {
      setSearch(s => s + input);
      setCursor(0);
    }
  }, { isActive: true });

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
    <Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
      <Box 
        width={70} 
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.green}
        backgroundColor={theme.panel}
        paddingX={1}
        paddingY={1}
      >
        <Box justifyContent="space-between" marginBottom={1}>
        <Text bold>{title}</Text>
        <Text color="gray">esc</Text>
      </Box>

      <Box marginBottom={1}>
        {search.length === 0 ? (
          <Text color={theme.gray}>
            <Text color={theme.green}>{placeholder.charAt(0)}</Text>
            {placeholder.slice(1)}
          </Text>
        ) : (
          <Text>{search}<Text color={theme.green}>█</Text></Text>
        )}
      </Box>

      <Box flexDirection="column">
        {visibleList.length === 0 ? (
          <Text color="gray">  No results found.</Text>
        ) : (
          visibleList.map((item, idx) => {
            const actualIdx = startIdx + idx;
            if (item.isCategory) {
              return <Box key={`cat-${actualIdx}`} marginTop={idx === 0 ? 0 : 1}>
                <Text color={theme.blue} bold>{item.label}</Text>
              </Box>;
            }
            const isSelected = actualIdx === currentFlatIndex;
            return (
              <Box 
                key={`item-${actualIdx}`} 
                backgroundColor={isSelected ? theme.green : undefined} 
                paddingX={1}
                width="100%"
              >
                <Text color={isSelected ? 'black' : theme.text}>
                  {item.label}
                  {item.hint && <Text color={isSelected ? '#14532d' : theme.dim}> {item.hint}</Text>}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
    </Box>
  );
}
