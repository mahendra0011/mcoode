"use client";
import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Search, ChevronRight, ChevronDown, Settings, RotateCcw,
  Copy, Filter, ExternalLink, SplitSquareHorizontal
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";

/* ─────────────────────── Types ─────────────────────── */

type SettingType = "boolean" | "string" | "number" | "enum" | "object";

interface SettingDef {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  default: any;
  options?: { value: string; label: string }[];
  tags?: string[];
}

interface SubCategory {
  id: string;
  label: string;
  settings: SettingDef[];
}

interface Category {
  id: string;
  label: string;
  subcategories?: SubCategory[];
  settings?: SettingDef[];
}

/* ─────────────────────── Settings Data ─────────────────────── */

const SETTINGS_DATA: Category[] = [
  {
    id: "commonly-used",
    label: "Commonly Used",
    settings: [
      { key: "editor.fontSize", label: "Editor: Font Size", description: "Controls the font size in pixels.", type: "number", default: 14 },
      { key: "editor.formatOnSave", label: "Editor: Format On Save", description: "Format a file on save. A formatter must be available and the editor must not be shutting down.", type: "boolean", default: false },
      { key: "editor.acceptSuggestionOnEnter", label: "Editor: Accept Suggestion On Enter", description: "Controls whether suggestions should be accepted on Enter, in addition to Tab.", type: "enum", default: "on", options: [{ value: "on", label: "on" }, { value: "smart", label: "smart" }, { value: "off", label: "off" }] },
      { key: "files.autoSave", label: "Files: Auto Save", description: "Controls auto save of editors that have unsaved changes.", type: "enum", default: "off", options: [{ value: "off", label: "off" }, { value: "afterDelay", label: "afterDelay" }, { value: "onFocusChange", label: "onFocusChange" }, { value: "onWindowChange", label: "onWindowChange" }] },
      { key: "editor.defaultFormatter", label: "Editor: Default Formatter", description: "Defines a default formatter which takes precedence over all other formatter settings.", type: "enum", default: "null", options: [{ value: "null", label: "None" }, { value: "prettier", label: "Prettier" }, { value: "eslint", label: "ESLint" }] },
      { key: "editor.fontFamily", label: "Editor: Font Family", description: "Controls the font family.", type: "string", default: "Consolas, 'Courier New', monospace" },
      { key: "editor.tabSize", label: "Editor: Tab Size", description: "The number of spaces a tab is equal to.", type: "number", default: 4 },
      { key: "editor.wordWrap", label: "Editor: Word Wrap", description: "Controls how lines should wrap.", type: "enum", default: "off", options: [{ value: "off", label: "off" }, { value: "on", label: "on" }, { value: "wordWrapColumn", label: "wordWrapColumn" }, { value: "bounded", label: "bounded" }] },
    ],
  },
  {
    id: "text-editor",
    label: "Text Editor",
    subcategories: [
      {
        id: "cursor",
        label: "Cursor",
        settings: [
          { key: "editor.cursorBlinking", label: "Cursor Blinking", description: "Control the cursor animation style.", type: "enum", default: "blink", options: [{ value: "blink", label: "blink" }, { value: "smooth", label: "smooth" }, { value: "phase", label: "phase" }, { value: "expand", label: "expand" }, { value: "solid", label: "solid" }] },
          { key: "editor.cursorStyle", label: "Cursor Style", description: "Controls the cursor style.", type: "enum", default: "line", options: [{ value: "line", label: "line" }, { value: "block", label: "block" }, { value: "underline", label: "underline" }, { value: "line-thin", label: "line-thin" }, { value: "block-outline", label: "block-outline" }, { value: "underline-thin", label: "underline-thin" }] },
          { key: "editor.cursorSmoothCaretAnimation", label: "Cursor Smooth Caret Animation", description: "Controls whether the smooth caret animation should be enabled.", type: "enum", default: "off", options: [{ value: "off", label: "off" }, { value: "explicit", label: "explicit" }, { value: "on", label: "on" }] },
          { key: "editor.cursorWidth", label: "Cursor Width", description: "Controls the width of the cursor when editor.cursorStyle is set to line.", type: "number", default: 0 },
          { key: "editor.cursorSurroundingLines", label: "Cursor Surrounding Lines", description: "Controls the minimal number of visible leading and trailing lines surrounding the cursor.", type: "number", default: 0 },
          { key: "editor.multiCursorModifier", label: "Multi Cursor Modifier", description: "The modifier to be used to add multiple cursors with the mouse.", type: "enum", default: "alt", options: [{ value: "ctrlCmd", label: "ctrlCmd" }, { value: "alt", label: "alt" }] },
        ],
      },
      {
        id: "find",
        label: "Find",
        settings: [
          { key: "editor.find.autoFindInSelection", label: "Auto Find In Selection", description: "Controls the condition for turning on Find in Selection automatically.", type: "enum", default: "never", options: [{ value: "never", label: "never" }, { value: "always", label: "always" }, { value: "multiline", label: "multiline" }] },
          { key: "editor.find.seedSearchStringFromSelection", label: "Seed Search String From Selection", description: "Controls whether the search string is seeded from the editor selection.", type: "enum", default: "always", options: [{ value: "never", label: "never" }, { value: "always", label: "always" }, { value: "selection", label: "selection" }] },
          { key: "editor.find.addExtraSpaceOnTop", label: "Add Extra Space On Top", description: "Controls whether the Find Widget should add extra lines on top of the editor.", type: "boolean", default: true },
          { key: "editor.find.loop", label: "Loop", description: "Controls whether the search automatically restarts from the beginning.", type: "boolean", default: true },
          { key: "editor.find.cursorMoveOnType", label: "Cursor Move On Type", description: "Controls whether the cursor should jump to find matches while typing.", type: "boolean", default: true },
        ],
      },
      {
        id: "font",
        label: "Font",
        settings: [
          { key: "editor.fontFamily", label: "Font Family", description: "Controls the font family.", type: "string", default: "Consolas, 'Courier New', monospace" },
          { key: "editor.fontSize", label: "Font Size", description: "Controls the font size in pixels.", type: "number", default: 14 },
          { key: "editor.fontWeight", label: "Font Weight", description: "Controls the font weight. Accepts 'normal', 'bold' or numbers 1-1000.", type: "string", default: "normal" },
          { key: "editor.fontLigatures", label: "Font Ligatures", description: "Configures font ligatures or font features.", type: "boolean", default: false },
          { key: "editor.lineHeight", label: "Line Height", description: "Controls the line height. Use 0 for automatic computation.", type: "number", default: 0 },
          { key: "editor.letterSpacing", label: "Letter Spacing", description: "Controls the letter spacing in pixels.", type: "number", default: 0 },
        ],
      },
      {
        id: "formatting",
        label: "Formatting",
        settings: [
          { key: "editor.formatOnSave", label: "Format On Save", description: "Format a file on save.", type: "boolean", default: false },
          { key: "editor.formatOnPaste", label: "Format On Paste", description: "Controls whether the editor should automatically format the pasted content.", type: "boolean", default: false },
          { key: "editor.formatOnType", label: "Format On Type", description: "Controls whether the editor should automatically format the line after typing.", type: "boolean", default: false },
          { key: "editor.formatOnSaveMode", label: "Format On Save Mode", description: "Controls if format on save formats the whole file or only modifications.", type: "enum", default: "file", options: [{ value: "file", label: "file" }, { value: "modifications", label: "modifications" }, { value: "modificationsIfAvailable", label: "modificationsIfAvailable" }] },
          { key: "editor.autoIndent", label: "Auto Indent", description: "Controls whether the editor should automatically adjust the indentation.", type: "enum", default: "full", options: [{ value: "none", label: "none" }, { value: "keep", label: "keep" }, { value: "brackets", label: "brackets" }, { value: "advanced", label: "advanced" }, { value: "full", label: "full" }] },
        ],
      },
      {
        id: "diff-editor",
        label: "Diff Editor",
        settings: [
          { key: "diffEditor.renderSideBySide", label: "Render Side By Side", description: "Controls whether the diff editor shows the diff side by side or inline.", type: "boolean", default: true },
          { key: "diffEditor.ignoreTrimWhitespace", label: "Ignore Trim Whitespace", description: "When enabled, the diff editor ignores changes in leading or trailing whitespace.", type: "boolean", default: true },
          { key: "diffEditor.codeLens", label: "Code Lens", description: "Controls whether the editor shows CodeLens.", type: "boolean", default: false },
          { key: "diffEditor.wordWrap", label: "Word Wrap", description: "Controls word wrapping in the diff editor.", type: "enum", default: "inherit", options: [{ value: "off", label: "off" }, { value: "on", label: "on" }, { value: "inherit", label: "inherit" }] },
          { key: "diffEditor.maxComputationTime", label: "Max Computation Time", description: "Timeout in ms after which diff computation is cancelled. Use 0 for no timeout.", type: "number", default: 5000 },
          { key: "diffEditor.maxFileSize", label: "Max File Size", description: "Maximum file size in MB for which to compute diffs.", type: "number", default: 50 },
          { key: "diffEditor.renderIndicators", label: "Render Indicators", description: "Controls whether the diff editor shows +/- indicators for added/removed changes.", type: "boolean", default: true },
        ],
      },
      {
        id: "minimap",
        label: "Minimap",
        settings: [
          { key: "editor.minimap.enabled", label: "Enabled", description: "Controls whether the minimap is shown.", type: "boolean", default: true },
          { key: "editor.minimap.side", label: "Side", description: "Controls the side where to render the minimap.", type: "enum", default: "right", options: [{ value: "left", label: "left" }, { value: "right", label: "right" }] },
          { key: "editor.minimap.maxColumn", label: "Max Column", description: "Limit the width of the minimap to render at most a certain number of columns.", type: "number", default: 120 },
          { key: "editor.minimap.renderCharacters", label: "Render Characters", description: "Render the actual characters on a line as opposed to color blocks.", type: "boolean", default: true },
          { key: "editor.minimap.scale", label: "Scale", description: "Scale of content drawn in the minimap: 1, 2 or 3.", type: "number", default: 1 },
          { key: "editor.minimap.showSlider", label: "Show Slider", description: "Controls when the minimap slider is shown.", type: "enum", default: "mouseover", options: [{ value: "always", label: "always" }, { value: "mouseover", label: "mouseover" }] },
        ],
      },
      {
        id: "suggestions",
        label: "Suggestions",
        settings: [
          { key: "editor.suggestOnTriggerCharacters", label: "Suggest On Trigger Characters", description: "Controls whether suggestions should automatically show up when typing trigger characters.", type: "boolean", default: true },
          { key: "editor.tabCompletion", label: "Tab Completion", description: "Enables tab completions.", type: "enum", default: "off", options: [{ value: "on", label: "on" }, { value: "off", label: "off" }, { value: "onlySnippets", label: "onlySnippets" }] },
          { key: "editor.snippetSuggestions", label: "Snippet Suggestions", description: "Controls whether snippets are shown with other suggestions and how they are sorted.", type: "enum", default: "inline", options: [{ value: "top", label: "top" }, { value: "bottom", label: "bottom" }, { value: "inline", label: "inline" }, { value: "none", label: "none" }] },
          { key: "editor.suggest.showIcons", label: "Show Icons", description: "Controls whether to show or hide icons in suggestions.", type: "boolean", default: true },
          { key: "editor.suggest.filterGraceful", label: "Filter Graceful", description: "Controls whether filtering suggestions accounts for small typos.", type: "boolean", default: true },
          { key: "editor.acceptSuggestionOnCommitCharacter", label: "Accept On Commit Character", description: "Controls whether suggestions should be accepted on commit characters.", type: "boolean", default: true },
          { key: "editor.quickSuggestionsDelay", label: "Quick Suggestions Delay", description: "Controls the delay in ms after which quick suggestions will show up.", type: "number", default: 10 },
          { key: "editor.inlineSuggest.enabled", label: "Inline Suggest Enabled", description: "Controls whether to automatically show inline suggestions in the editor.", type: "boolean", default: true },
        ],
      },
      {
        id: "files",
        label: "Files",
        settings: [
          { key: "files.autoSave", label: "Auto Save", description: "Controls auto save of editors that have unsaved changes.", type: "enum", default: "off", options: [{ value: "off", label: "off" }, { value: "afterDelay", label: "afterDelay" }, { value: "onFocusChange", label: "onFocusChange" }, { value: "onWindowChange", label: "onWindowChange" }] },
          { key: "files.autoSaveDelay", label: "Auto Save Delay", description: "Controls the delay in ms after which an editor with unsaved changes is saved automatically.", type: "number", default: 1000 },
          { key: "files.encoding", label: "Encoding", description: "The default character set encoding to use.", type: "enum", default: "utf8", options: [{ value: "utf8", label: "UTF-8" }, { value: "utf8bom", label: "UTF-8 with BOM" }, { value: "utf16le", label: "UTF-16 LE" }, { value: "utf16be", label: "UTF-16 BE" }] },
          { key: "files.eol", label: "EOL", description: "The default end of line character.", type: "enum", default: "auto", options: [{ value: "\\n", label: "LF" }, { value: "\\r\\n", label: "CRLF" }, { value: "auto", label: "auto" }] },
          { key: "files.trimTrailingWhitespace", label: "Trim Trailing Whitespace", description: "When enabled, will trim trailing whitespace when saving a file.", type: "boolean", default: false },
          { key: "files.insertFinalNewline", label: "Insert Final Newline", description: "When enabled, insert a final new line at the end of the file when saving it.", type: "boolean", default: false },
          { key: "files.trimFinalNewlines", label: "Trim Final Newlines", description: "When enabled, will trim all new lines after the final new line at the end of the file.", type: "boolean", default: false },
        ],
      },
    ],
    settings: [
      { key: "editor.renderWhitespace", label: "Render Whitespace", description: "Controls how the editor should render whitespace characters.", type: "enum", default: "selection", options: [{ value: "none", label: "none" }, { value: "boundary", label: "boundary" }, { value: "selection", label: "selection" }, { value: "trailing", label: "trailing" }, { value: "all", label: "all" }] },
      { key: "editor.renderLineHighlight", label: "Render Line Highlight", description: "Controls how the editor should render the current line highlight.", type: "enum", default: "line", options: [{ value: "none", label: "none" }, { value: "gutter", label: "gutter" }, { value: "line", label: "line" }, { value: "all", label: "all" }] },
      { key: "editor.bracketPairColorization.enabled", label: "Bracket Pair Colorization", description: "Controls whether bracket pair colorization is enabled.", type: "boolean", default: true },
      { key: "editor.guides.indentation", label: "Indent Guides", description: "Controls whether the editor should render indent guides.", type: "boolean", default: true },
      { key: "editor.stickyScroll.enabled", label: "Sticky Scroll", description: "Shows the nested current scopes during the scroll at the top of the editor.", type: "boolean", default: true },
      { key: "editor.links", label: "Links", description: "Controls whether the editor should detect links and make them clickable.", type: "boolean", default: true },
      { key: "editor.codeLens", label: "Code Lens", description: "Controls whether the editor shows CodeLens.", type: "boolean", default: true },
      { key: "editor.folding", label: "Folding", description: "Controls whether the editor has code folding enabled.", type: "boolean", default: true },
      { key: "editor.glyphMargin", label: "Glyph Margin", description: "Controls whether the editor should render the vertical glyph margin.", type: "boolean", default: true },
      { key: "editor.matchBrackets", label: "Match Brackets", description: "Highlight matching brackets.", type: "enum", default: "always", options: [{ value: "never", label: "never" }, { value: "near", label: "near" }, { value: "always", label: "always" }] },
      { key: "editor.colorDecorators", label: "Color Decorators", description: "Controls whether the editor should render the inline color decorators and color picker.", type: "boolean", default: true },
      { key: "editor.smoothScrolling", label: "Smooth Scrolling", description: "Controls whether the editor will scroll using an animation.", type: "boolean", default: false },
      { key: "editor.mouseWheelZoom", label: "Mouse Wheel Zoom", description: "Zoom the font of the editor when using mouse wheel and holding Ctrl.", type: "boolean", default: false },
      { key: "editor.copyWithSyntaxHighlighting", label: "Copy With Syntax Highlighting", description: "Controls whether syntax highlighting should be copied into the clipboard.", type: "boolean", default: true },
      { key: "editor.emptySelectionClipboard", label: "Empty Selection Clipboard", description: "Controls whether copying without a selection copies the current line.", type: "boolean", default: true },
      { key: "editor.dragAndDrop", label: "Drag And Drop", description: "Controls whether the editor should allow moving selections via drag and drop.", type: "boolean", default: true },
      { key: "editor.insertSpaces", label: "Insert Spaces", description: "Insert spaces when pressing Tab.", type: "boolean", default: true },
      { key: "editor.detectIndentation", label: "Detect Indentation", description: "Controls whether tab size and insert spaces will be automatically detected.", type: "boolean", default: true },
      { key: "editor.trimAutoWhitespace", label: "Trim Auto Whitespace", description: "Remove trailing auto inserted whitespace.", type: "boolean", default: true },
      { key: "editor.lineNumbers", label: "Line Numbers", description: "Controls the display of line numbers.", type: "enum", default: "on", options: [{ value: "off", label: "off" }, { value: "on", label: "on" }, { value: "relative", label: "relative" }, { value: "interval", label: "interval" }] },
      { key: "editor.scrollBeyondLastLine", label: "Scroll Beyond Last Line", description: "Controls whether the editor will scroll beyond the last line.", type: "boolean", default: true },
      { key: "editor.wordWrapColumn", label: "Word Wrap Column", description: "Controls the wrapping column of the editor when wordWrap is wordWrapColumn or bounded.", type: "number", default: 80 },
      { key: "editor.wrappingIndent", label: "Wrapping Indent", description: "Controls the indentation of wrapped lines.", type: "enum", default: "same", options: [{ value: "none", label: "none" }, { value: "same", label: "same" }, { value: "indent", label: "indent" }, { value: "deepIndent", label: "deepIndent" }] },
      { key: "editor.autoClosingBrackets", label: "Auto Closing Brackets", description: "Controls whether the editor should automatically close brackets.", type: "enum", default: "languageDefined", options: [{ value: "always", label: "always" }, { value: "languageDefined", label: "languageDefined" }, { value: "beforeWhitespace", label: "beforeWhitespace" }, { value: "never", label: "never" }] },
      { key: "editor.autoClosingQuotes", label: "Auto Closing Quotes", description: "Controls whether the editor should automatically close quotes.", type: "enum", default: "languageDefined", options: [{ value: "always", label: "always" }, { value: "languageDefined", label: "languageDefined" }, { value: "beforeWhitespace", label: "beforeWhitespace" }, { value: "never", label: "never" }] },
      { key: "editor.autoSurround", label: "Auto Surround", description: "Controls whether the editor should automatically surround selections when typing quotes or brackets.", type: "enum", default: "languageDefined", options: [{ value: "languageDefined", label: "languageDefined" }, { value: "quotes", label: "quotes" }, { value: "brackets", label: "brackets" }, { value: "never", label: "never" }] },
    ],
  },
  {
    id: "workbench",
    label: "Workbench",
    settings: [
      { key: "workbench.colorTheme", label: "Color Theme", description: "Specifies the color theme used in the workbench.", type: "enum", default: "Dark 2026", options: [{ value: "Dark 2026", label: "Dark 2026" }, { value: "Dark+", label: "Dark+" }, { value: "Light+", label: "Light+" }, { value: "Monokai", label: "Monokai" }, { value: "One Dark Pro", label: "One Dark Pro" }] },
      { key: "workbench.iconTheme", label: "Icon Theme", description: "Specifies the file icon theme used in the workbench.", type: "enum", default: "vs-seti", options: [{ value: "vs-seti", label: "Seti" }, { value: "vs-minimal", label: "Minimal" }, { value: "null", label: "None" }] },
      { key: "workbench.startupEditor", label: "Startup Editor", description: "Controls which editor is shown at startup.", type: "enum", default: "welcomePage", options: [{ value: "none", label: "none" }, { value: "welcomePage", label: "welcomePage" }, { value: "newUntitledFile", label: "newUntitledFile" }, { value: "readme", label: "readme" }] },
      { key: "workbench.sideBar.location", label: "Side Bar Location", description: "Controls the location of the primary side bar.", type: "enum", default: "left", options: [{ value: "left", label: "left" }, { value: "right", label: "right" }] },
      { key: "workbench.panel.defaultLocation", label: "Panel Default Location", description: "Controls the default location of the panel.", type: "enum", default: "bottom", options: [{ value: "bottom", label: "bottom" }, { value: "right", label: "right" }, { value: "left", label: "left" }] },
      { key: "workbench.editor.showTabs", label: "Show Tabs", description: "Controls whether opened editors should show as individual tabs.", type: "enum", default: "multiple", options: [{ value: "multiple", label: "multiple" }, { value: "single", label: "single" }, { value: "none", label: "none" }] },
      { key: "workbench.editor.enablePreview", label: "Enable Preview", description: "Controls whether preview mode is used when editors open.", type: "boolean", default: true },
      { key: "workbench.statusBar.visible", label: "Status Bar Visible", description: "Controls the visibility of the status bar.", type: "boolean", default: true },
      { key: "workbench.tips.enabled", label: "Tips Enabled", description: "When enabled, will show the watermark tips when no editor is open.", type: "boolean", default: true },
      { key: "workbench.tree.indent", label: "Tree Indent", description: "Controls tree indentation in pixels.", type: "number", default: 8 },
      { key: "workbench.editor.tabSizing", label: "Tab Sizing", description: "Controls the size of editor tabs.", type: "enum", default: "fit", options: [{ value: "fit", label: "fit" }, { value: "shrink", label: "shrink" }, { value: "fixed", label: "fixed" }] },
      { key: "workbench.list.smoothScrolling", label: "List Smooth Scrolling", description: "Controls whether lists and trees have smooth scrolling.", type: "boolean", default: false },
      { key: "workbench.activityBar.location", label: "Activity Bar Location", description: "Controls the location of the Activity Bar.", type: "enum", default: "default", options: [{ value: "default", label: "default" }, { value: "top", label: "top" }, { value: "bottom", label: "bottom" }, { value: "hidden", label: "hidden" }] },
      { key: "workbench.reduceMotion", label: "Reduce Motion", description: "Controls whether the workbench should render with fewer animations.", type: "enum", default: "auto", options: [{ value: "on", label: "on" }, { value: "off", label: "off" }, { value: "auto", label: "auto" }] },
    ],
  },
  {
    id: "window",
    label: "Window",
    settings: [
      { key: "window.zoomLevel", label: "Zoom Level", description: "Adjust the default zoom level for all windows. Each increment above 0 represents zooming 20% larger.", type: "number", default: 0 },
      { key: "window.restoreWindows", label: "Restore Windows", description: "Controls how windows are being restored when opening.", type: "enum", default: "all", options: [{ value: "preserve", label: "preserve" }, { value: "all", label: "all" }, { value: "folders", label: "folders" }, { value: "one", label: "one" }, { value: "none", label: "none" }] },
      { key: "window.titleBarStyle", label: "Title Bar Style", description: "Adjust the appearance of the window title bar.", type: "enum", default: "custom", options: [{ value: "native", label: "native" }, { value: "custom", label: "custom" }] },
      { key: "window.menuBarVisibility", label: "Menu Bar Visibility", description: "Control the visibility of the menu bar.", type: "enum", default: "classic", options: [{ value: "classic", label: "classic" }, { value: "visible", label: "visible" }, { value: "toggle", label: "toggle" }, { value: "hidden", label: "hidden" }, { value: "compact", label: "compact" }] },
      { key: "window.confirmBeforeClose", label: "Confirm Before Close", description: "Controls whether to show a confirmation dialog before closing.", type: "enum", default: "never", options: [{ value: "always", label: "always" }, { value: "keyboardOnly", label: "keyboardOnly" }, { value: "never", label: "never" }] },
      { key: "window.commandCenter", label: "Command Center", description: "Show command launcher together with the window title.", type: "boolean", default: true },
      { key: "window.newWindowDimensions", label: "New Window Dimensions", description: "Controls the dimensions of opening a new window.", type: "enum", default: "default", options: [{ value: "default", label: "default" }, { value: "inherit", label: "inherit" }, { value: "offset", label: "offset" }, { value: "maximized", label: "maximized" }, { value: "fullscreen", label: "fullscreen" }] },
    ],
  },
  {
    id: "chat",
    label: "Chat",
    settings: [
      { key: "chat.editor.fontSize", label: "Editor Font Size", description: "Controls the font size in pixels in chat code blocks.", type: "number", default: 14 },
      { key: "chat.editor.fontFamily", label: "Editor Font Family", description: "Controls the font family in chat code blocks.", type: "string", default: "default" },
      { key: "chat.editor.wordWrap", label: "Editor Word Wrap", description: "Controls whether lines should wrap in chat code blocks.", type: "enum", default: "off", options: [{ value: "off", label: "off" }, { value: "on", label: "on" }] },
    ],
  },
  {
    id: "features",
    label: "Features",
    subcategories: [
      {
        id: "terminal",
        label: "Terminal",
        settings: [
          { key: "terminal.integrated.fontSize", label: "Font Size", description: "Controls the font size in pixels of the terminal.", type: "number", default: 14 },
          { key: "terminal.integrated.fontFamily", label: "Font Family", description: "Controls the font family of the terminal.", type: "string", default: "" },
          { key: "terminal.integrated.lineHeight", label: "Line Height", description: "Controls the line height of the terminal.", type: "number", default: 1 },
          { key: "terminal.integrated.cursorBlinking", label: "Cursor Blinking", description: "Controls whether the terminal cursor blinks.", type: "boolean", default: false },
          { key: "terminal.integrated.cursorStyle", label: "Cursor Style", description: "Controls the style of terminal cursor.", type: "enum", default: "block", options: [{ value: "block", label: "block" }, { value: "underline", label: "underline" }, { value: "line", label: "line" }] },
          { key: "terminal.integrated.scrollback", label: "Scrollback", description: "Controls the maximum number of lines the terminal keeps in its buffer.", type: "number", default: 1000 },
          { key: "terminal.integrated.copyOnSelection", label: "Copy On Selection", description: "When set, text selected in the terminal will be copied to the clipboard.", type: "boolean", default: false },
        ],
      },
      {
        id: "debug",
        label: "Debug",
        settings: [
          { key: "debug.console.fontSize", label: "Console Font Size", description: "Controls the font size in pixels in the Debug Console.", type: "number", default: 14 },
          { key: "debug.console.wordWrap", label: "Console Word Wrap", description: "Controls if the lines should wrap in the Debug Console.", type: "boolean", default: true },
          { key: "debug.showInStatusBar", label: "Show In Status Bar", description: "Controls when the debug status bar item should be visible.", type: "enum", default: "onFirstSessionStart", options: [{ value: "never", label: "never" }, { value: "always", label: "always" }, { value: "onFirstSessionStart", label: "onFirstSessionStart" }] },
          { key: "debug.inlineValues", label: "Inline Values", description: "Show variable values inline in editor while debugging.", type: "enum", default: "auto", options: [{ value: "on", label: "on" }, { value: "off", label: "off" }, { value: "auto", label: "auto" }] },
          { key: "debug.allowBreakpointsEverywhere", label: "Allow Breakpoints Everywhere", description: "Allow setting breakpoints in any file.", type: "boolean", default: false },
          { key: "debug.toolBarLocation", label: "Toolbar Location", description: "Controls the location of the debug toolbar.", type: "enum", default: "floating", options: [{ value: "floating", label: "floating" }, { value: "docked", label: "docked" }, { value: "hidden", label: "hidden" }] },
        ],
      },
      {
        id: "scm",
        label: "Source Control",
        settings: [
          { key: "scm.defaultViewMode", label: "Default View Mode", description: "Controls the default Source Control repository view mode.", type: "enum", default: "list", options: [{ value: "tree", label: "tree" }, { value: "list", label: "list" }] },
          { key: "scm.diffDecorations", label: "Diff Decorations", description: "Controls diff decorations in the editor.", type: "enum", default: "all", options: [{ value: "all", label: "all" }, { value: "gutter", label: "gutter" }, { value: "overview", label: "overview" }, { value: "minimap", label: "minimap" }, { value: "none", label: "none" }] },
          { key: "scm.alwaysShowActions", label: "Always Show Actions", description: "Controls whether inline actions are always visible in the Source Control view.", type: "boolean", default: false },
          { key: "scm.countBadge", label: "Count Badge", description: "Controls the count badge on the Source Control icon.", type: "enum", default: "all", options: [{ value: "all", label: "all" }, { value: "focused", label: "focused" }, { value: "off", label: "off" }] },
          { key: "scm.inputFontSize", label: "Input Font Size", description: "Controls the font size for the input message in pixels.", type: "number", default: 13 },
        ],
      },
      {
        id: "search",
        label: "Search",
        settings: [
          { key: "search.useIgnoreFiles", label: "Use Ignore Files", description: "Controls whether to use .gitignore and .ignore files when searching.", type: "boolean", default: true },
          { key: "search.followSymlinks", label: "Follow Symlinks", description: "Controls whether to follow symlinks while searching.", type: "boolean", default: true },
          { key: "search.smartCase", label: "Smart Case", description: "Search case-insensitively if the pattern is all lowercase.", type: "boolean", default: false },
          { key: "search.showLineNumbers", label: "Show Line Numbers", description: "Controls whether to show line numbers for search results.", type: "boolean", default: false },
          { key: "search.collapseResults", label: "Collapse Results", description: "Controls whether the search results will be collapsed or expanded.", type: "enum", default: "alwaysExpand", options: [{ value: "auto", label: "auto" }, { value: "alwaysCollapse", label: "alwaysCollapse" }, { value: "alwaysExpand", label: "alwaysExpand" }] },
        ],
      },
    ],
  },
  {
    id: "application",
    label: "Application",
    settings: [
      { key: "update.mode", label: "Update Mode", description: "Configure whether you receive automatic updates.", type: "enum", default: "default", options: [{ value: "none", label: "none" }, { value: "manual", label: "manual" }, { value: "start", label: "start" }, { value: "default", label: "default" }] },
      { key: "update.showReleaseNotes", label: "Show Release Notes", description: "Show Release Notes after an update.", type: "boolean", default: true },
      { key: "telemetry.telemetryLevel", label: "Telemetry Level", description: "Controls the telemetry level.", type: "enum", default: "all", options: [{ value: "off", label: "off" }, { value: "crash", label: "crash" }, { value: "error", label: "error" }, { value: "all", label: "all" }] },
    ],
  },
  {
    id: "security",
    label: "Security",
    settings: [
      { key: "security.workspace.trust.enabled", label: "Workspace Trust", description: "Controls whether Workspace Trust is enabled.", type: "boolean", default: true },
      { key: "security.workspace.trust.startupPrompt", label: "Trust Startup Prompt", description: "Controls when the startup prompt to trust a workspace is shown.", type: "enum", default: "never", options: [{ value: "always", label: "always" }, { value: "once", label: "once" }, { value: "never", label: "never" }] },
      { key: "security.workspace.trust.untrustedFiles", label: "Untrusted Files", description: "Controls how to handle opening untrusted files.", type: "enum", default: "prompt", options: [{ value: "prompt", label: "prompt" }, { value: "open", label: "open" }, { value: "newWindow", label: "newWindow" }] },
    ],
  },
  {
    id: "extensions",
    label: "Extensions",
    settings: [
      { key: "extensions.autoUpdate", label: "Auto Update", description: "Controls the automatic update behavior of extensions.", type: "boolean", default: true },
      { key: "extensions.autoCheckUpdates", label: "Auto Check Updates", description: "When enabled, automatically checks extensions for updates.", type: "boolean", default: true },
      { key: "extensions.ignoreRecommendations", label: "Ignore Recommendations", description: "When enabled, the extension recommendation notifications will not be shown.", type: "boolean", default: false },
    ],
  },
];

/* ─────────────────────── Component ─────────────────────── */

function SettingInput({
  setting,
  value,
  onChange,
}: {
  setting: SettingDef;
  value: any;
  onChange: (key: string, val: any) => void;
}) {
  switch (setting.type) {
    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer mt-1.5">
          <input
            type="checkbox"
            checked={value ?? setting.default}
            onChange={(e) => onChange(setting.key, e.target.checked)}
            className="w-4 h-4 rounded border border-white/20 bg-transparent accent-[#007acc] cursor-pointer"
          />
          <span className="text-[13px] text-white/70">{setting.description}</span>
        </label>
      );
    case "number":
      return (
        <input
          type="number"
          value={value ?? setting.default}
          onChange={(e) => onChange(setting.key, Number(e.target.value))}
          className="mt-1.5 w-[80px] bg-[#3c3c3c] border border-white/10 text-white text-[13px] px-2 py-1 rounded focus:outline-none focus:border-[#007acc] transition"
        />
      );
    case "string":
      return (
        <input
          type="text"
          value={value ?? setting.default}
          onChange={(e) => onChange(setting.key, e.target.value)}
          className="mt-1.5 w-full max-w-[400px] bg-[#3c3c3c] border border-white/10 text-white text-[13px] px-2 py-1 rounded focus:outline-none focus:border-[#007acc] transition"
        />
      );
    case "enum":
      return (
        <div className="relative mt-1.5">
          <select
            value={value ?? setting.default}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className="appearance-none bg-[#3c3c3c] border border-white/10 text-white text-[13px] px-2 py-1 pr-7 rounded cursor-pointer hover:border-white/20 transition focus:outline-none focus:border-[#007acc] min-w-[160px]"
          >
            {setting.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      );
    default:
      return null;
  }
}

function SettingRow({ setting, value, onChange }: { setting: SettingDef; value: any; onChange: (key: string, val: any) => void }) {
  return (
    <div className="py-3 px-1 border-b border-white/5 last:border-b-0 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white">{setting.label}</div>
          {setting.type !== "boolean" && (
            <div className="text-[12px] text-white/50 mt-0.5 leading-relaxed">
              {setting.description}
            </div>
          )}
          <SettingInput setting={setting} value={value} onChange={onChange} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition mt-0.5 flex items-center gap-1">
          <button type="button" className="p-1 hover:bg-white/10 rounded transition cursor-pointer" title="Copy Setting ID">
            <Copy className="w-3 h-3 text-white/40" />
          </button>
          <button
            type="button"
            className="p-1 hover:bg-white/10 rounded transition cursor-pointer"
            title="Reset to Default"
            onClick={() => onChange(setting.key, setting.default)}
          >
            <RotateCcw className="w-3 h-3 text-white/40" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdvancedSettingsModal() {
  const isOpen = useIDEStore((s) => s.isAdvancedSettingsOpen);
  const setOpen = useIDEStore((s) => s.setAdvancedSettingsOpen);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("commonly-used");
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["text-editor", "features"]));
  const [settingValues, setSettingValues] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"user" | "workspace">("user");

  const handleChange = useCallback((key: string, val: any) => {
    setSettingValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: SettingDef[] = [];
    for (const cat of SETTINGS_DATA) {
      if (cat.settings) {
        for (const s of cat.settings) {
          if (s.key.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
            results.push(s);
          }
        }
      }
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          for (const s of sub.settings) {
            if (s.key.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
              results.push(s);
            }
          }
        }
      }
    }
    return results;
  }, [searchQuery]);

  const activeSettings = useMemo(() => {
    if (filteredSettings) return filteredSettings;
    for (const cat of SETTINGS_DATA) {
      if (activeSubId) {
        const sub = cat.subcategories?.find((s) => s.id === activeSubId);
        if (sub) return sub.settings;
      }
      if (cat.id === activeCategoryId) {
        return cat.settings || (cat.subcategories?.[0]?.settings || []);
      }
    }
    return [];
  }, [activeCategoryId, activeSubId, filteredSettings]);

  const activeLabel = useMemo(() => {
    if (filteredSettings) return `Search Results (${filteredSettings.length})`;
    for (const cat of SETTINGS_DATA) {
      if (activeSubId) {
        const sub = cat.subcategories?.find((s) => s.id === activeSubId);
        if (sub) return sub.label;
      }
      if (cat.id === activeCategoryId) return cat.label;
    }
    return "Settings";
  }, [activeCategoryId, activeSubId, filteredSettings]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
      <div
        className="w-[960px] max-w-[95vw] h-[85vh] bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeScaleIn 0.2s ease-out" }}
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#252526] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-white/50" />
            <span className="text-[13px] font-semibold text-white">Settings</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="p-1 hover:bg-white/10 rounded transition cursor-pointer text-white/40 hover:text-white" title="Open Settings JSON">
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 hover:bg-white/10 rounded transition cursor-pointer text-white/40 hover:text-white" title="Filter">
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded transition cursor-pointer text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2 border-b border-white/5 flex-shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (↑↓ for history)"
              className="w-full bg-[#3c3c3c] border border-white/10 text-white text-[13px] pl-8 pr-3 py-1.5 rounded focus:outline-none focus:border-[#007acc] transition placeholder:text-white/30"
            />
          </div>
        </div>

        {/* User / Workspace tabs */}
        <div className="px-4 py-1 border-b border-white/5 flex items-center gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("user")}
            className={`text-[12px] font-medium pb-1 border-b-2 transition cursor-pointer ${
              activeTab === "user" ? "text-white border-white" : "text-white/50 border-transparent hover:text-white/80"
            }`}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`text-[12px] font-medium pb-1 border-b-2 transition cursor-pointer ${
              activeTab === "workspace" ? "text-white border-white" : "text-white/50 border-transparent hover:text-white/80"
            }`}
          >
            Workspace
          </button>
          <div className="flex-1" />
          <span className="text-[11px] text-white/30">Last synced: 0 secs ago</span>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-[180px] border-r border-white/5 overflow-y-auto custom-scrollbar flex-shrink-0 py-1">
            {SETTINGS_DATA.map((cat) => (
              <div key={cat.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (cat.subcategories) {
                      toggleExpand(cat.id);
                    }
                    setActiveCategoryId(cat.id);
                    setActiveSubId(null);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-1 px-3 py-1 text-left text-[12px] transition cursor-pointer ${
                    activeCategoryId === cat.id && !activeSubId
                      ? "bg-[#04395e] text-white font-semibold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {cat.subcategories ? (
                    expandedCategories.has(cat.id) ? (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    )
                  ) : (
                    <span className="w-3" />
                  )}
                  {cat.label}
                </button>
                {cat.subcategories && expandedCategories.has(cat.id) && (
                  <div className="ml-3">
                    {cat.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setActiveCategoryId(cat.id);
                          setActiveSubId(sub.id);
                          setSearchQuery("");
                        }}
                        className={`w-full pl-5 pr-3 py-1 text-left text-[12px] transition cursor-pointer ${
                          activeSubId === sub.id
                            ? "bg-[#04395e] text-white font-semibold"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            <h2 className="text-[18px] font-bold text-white mb-4">{activeLabel}</h2>
            <div className="flex flex-col">
              {(activeSettings || []).map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  value={settingValues[setting.key]}
                  onChange={handleChange}
                />
              ))}
              {(activeSettings || []).length === 0 && (
                <div className="text-white/30 text-[13px] py-8 text-center">No settings found.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

export default AdvancedSettingsModal;
