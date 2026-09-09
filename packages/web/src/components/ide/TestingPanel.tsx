"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  RotateCw,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
  FileCode,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { toast } from "sonner";

export interface TestCase {
  id: string;
  name: string;
  fileId: string;
  fn: () => void | Promise<void>;
  status: "idle" | "running" | "passed" | "failed";
  error?: string;
  durationMs?: number;
}

/**
 * Minimal Test Runner Helpers (no external Jest/Mocha dependencies needed)
 */
export function defineTest(name: string, fn: () => void | Promise<void>) {
  return { name, fn };
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item: any) {
      if (typeof actual === "string" || Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
        }
      } else {
        throw new Error(`Target is neither an array nor a string`);
      }
    },
  };
}

export interface TestingPanelProps {
  tests?: TestCase[];
  onJumpToFile?: (fileId: string) => void;
}

export function TestingPanel({
  tests: propTests,
  onJumpToFile: propOnJumpToFile,
}: TestingPanelProps = {}) {
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const fileContentsCache = useIDEStore((s) => s.fileContentsCache);
  const setFileContent = useIDEStore((s) => s.setFileContent);

  const [searchQuery, setSearchQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // Default built-in project sanity tests
  const defaultTests: TestCase[] = useMemo(
    () => [
      {
        id: "core-math-1",
        name: "adds numbers correctly (1 + 2 === 3)",
        fileId: "tests/example.test.js",
        status: "idle",
        fn: () => {
          expect(1 + 2).toBe(3);
        },
      },
      {
        id: "core-str-2",
        name: "string concatenation ('a' + 'b' === 'ab')",
        fileId: "tests/example.test.js",
        status: "idle",
        fn: () => {
          expect("a" + "b").toBe("ab");
        },
      },
      {
        id: "core-arr-3",
        name: "verifies array equality ([1, 2, 3])",
        fileId: "tests/example.test.js",
        status: "idle",
        fn: () => {
          expect([1, 2, 3]).toEqual([1, 2, 3]);
        },
      },
      {
        id: "core-ext-4",
        name: "extensions catalog contains pre-bundled entries",
        fileId: "src/lib/extensions/catalog.ts",
        status: "idle",
        fn: async () => {
          const { catalog } = await import("../../lib/extensions/catalog");
          expect(Array.isArray(catalog)).toBeTruthy();
          expect(catalog.length >= 5).toBeTruthy();
        },
      },
      {
        id: "core-browser-5",
        name: "browser window runtime environment active",
        fileId: "src/App.tsx",
        status: "idle",
        fn: () => {
          if (typeof window === "undefined") {
            throw new Error("Window object is undefined in this environment");
          }
          expect(typeof window.document).toBe("object");
        },
      },
    ],
    []
  );

  // Discover dynamic tests written by user in files
  const discoveredTests = useMemo<TestCase[]>(() => {
    const list: TestCase[] = [];

    for (const [filePath, content] of Object.entries(fileContentsCache)) {
      if (
        filePath.endsWith(".test.js") ||
        filePath.endsWith(".test.ts") ||
        filePath.endsWith(".spec.js") ||
        filePath.endsWith(".spec.ts") ||
        content.includes("defineTest(")
      ) {
        // Regex extract defineTest calls: defineTest("name", ...)
        const regex = /defineTest\s*\(\s*["'`](.*?)["'`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
          const testName = match[1];
          const testBody = match[2];
          const testId = `user_${filePath}_${testName.replace(/\s+/g, "_")}`;

          list.push({
            id: testId,
            name: testName,
            fileId: filePath,
            status: "idle",
            fn: () => {
              // Execute inside an isolated sandbox with expect injected
              const iframe = document.createElement("iframe");
              iframe.style.display = "none";
              iframe.sandbox.add("allow-scripts");
              document.body.appendChild(iframe);
              const win = iframe.contentWindow as any;

              win.expect = expect;
              win.defineTest = defineTest;

              try {
                win.eval(`(function() { ${testBody} })()`);
              } finally {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }
            },
          });
        }
      }
    }

    return list;
  }, [fileContentsCache]);

  const [testSuite, setTestSuite] = useState<TestCase[]>(() => propTests || defaultTests);

  // Sync testSuite when discovered tests or propTests change
  useEffect(() => {
    if (propTests) {
      setTestSuite(propTests);
      return;
    }

    setTestSuite((prev) => {
      const merged = [...defaultTests];
      for (const d of discoveredTests) {
        const existingIdx = merged.findIndex((m) => m.id === d.id);
        if (existingIdx >= 0) {
          merged[existingIdx] = { ...d, status: prev.find((p) => p.id === d.id)?.status || "idle" };
        } else {
          merged.push(d);
        }
      }
      return merged;
    });
  }, [discoveredTests, defaultTests, propTests]);

  const jumpToFile = useCallback(
    (fileId: string) => {
      if (propOnJumpToFile) {
        propOnJumpToFile(fileId);
        return;
      }
      addOpenFile(fileId);
      setActivePath(fileId);
      setTargetJump({ path: fileId, line: 1 });
    },
    [propOnJumpToFile, addOpenFile, setActivePath, setTargetJump]
  );

  async function runSingleTest(test: TestCase): Promise<TestCase> {
    const start = performance.now();
    try {
      await test.fn();
      const durationMs = Math.round(performance.now() - start);
      return { ...test, status: "passed", error: undefined, durationMs };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      return {
        ...test,
        status: "failed",
        error: err?.message || String(err),
        durationMs,
      };
    }
  }

  async function handleRunAll() {
    setIsRunning(true);
    setTestSuite((prev) => prev.map((t) => ({ ...t, status: "running" })));

    for (const test of testSuite) {
      const updated = await runSingleTest(test);
      setTestSuite((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }

    setIsRunning(false);
    toast.success("Test run completed");
  }

  async function handleRunSingle(e: React.MouseEvent, test: TestCase) {
    e.stopPropagation();
    setTestSuite((prev) =>
      prev.map((t) => (t.id === test.id ? { ...t, status: "running" } : t))
    );
    const updated = await runSingleTest(test);
    setTestSuite((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  // Scaffolds a new test file in the workspace
  function handleCreateTestFile() {
    const filePath = "tests/example.test.js";
    const sampleContent = `// In-Browser Unit Test File
// Use defineTest() and expect() to write assertions

defineTest("adds numbers correctly", () => {
  expect(1 + 2).toBe(3);
});

defineTest("string concatenation", () => {
  expect("a" + "b").toBe("ab");
});

defineTest("verifies array equality", () => {
  expect([1, 2, 3]).toEqual([1, 2, 3]);
});

defineTest("handles failure gracefully", () => {
  // Try changing 5 to 4 to make this test pass!
  expect(2 * 2).toBe(4);
});
`;

    setFileContent(filePath, sampleContent);
    addOpenFile(filePath);
    setActivePath(filePath);
    toast.success(`Created sample test file: ${filePath}`);
  }

  // Filter tests
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return testSuite;
    const q = searchQuery.toLowerCase();
    return testSuite.filter(
      (t) => t.name.toLowerCase().includes(q) || t.fileId.toLowerCase().includes(q)
    );
  }, [testSuite, searchQuery]);

  // Group by fileId
  const groupedByFile = useMemo(() => {
    const groups: Record<string, TestCase[]> = {};
    for (const t of filteredTests) {
      if (!groups[t.fileId]) groups[t.fileId] = [];
      groups[t.fileId].push(t);
    }
    return groups;
  }, [filteredTests]);

  const passed = testSuite.filter((t) => t.status === "passed").length;
  const failed = testSuite.filter((t) => t.status === "failed").length;

  const toggleFileCollapse = (fileId: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs min-w-[240px] overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 border-b border-white/5 flex items-center justify-between gap-2 bg-[#181818]/90 flex-shrink-0">
        <span className="font-semibold uppercase tracking-wider text-white/60 text-[11px] truncate">
          TESTING
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded font-medium bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs disabled:opacity-40 transition shadow-sm"
            title="Run All Tests"
          >
            {isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>Run All</span>
          </button>

          <button
            type="button"
            onClick={handleCreateTestFile}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Create Sample Test File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setTestSuite((prev) => prev.map((t) => ({ ...t, status: "idle" })))}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Reset Statuses"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pass / Fail Summary Bar */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between text-[11px] bg-white/[0.02] flex-shrink-0">
        <span className="text-white/50">{testSuite.length} Total</span>
        <div className="flex items-center gap-2 font-medium">
          <span className="text-[#34d399] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {passed} Passed
          </span>
          <span className="text-[#f87171] flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {failed} Failed
          </span>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="p-2 border-b border-white/5 bg-[#161616] flex items-center gap-1.5 flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-white/30 pl-0.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter tests..."
          className="flex-1 bg-transparent border-none outline-none font-sans text-xs text-white placeholder-white/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-white/30 hover:text-white text-[11px] px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Test Tree / Accordion */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2 flex flex-col gap-2">
        {filteredTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-white/40">
            <Sparkles className="w-6 h-6 text-white/20 mb-2" />
            <p className="text-xs">No matching tests found.</p>
            <button
              type="button"
              onClick={handleCreateTestFile}
              className="mt-3 text-[#3794ff] hover:underline text-xs bg-transparent border-none p-0 cursor-pointer"
            >
              + Create sample test file
            </button>
          </div>
        ) : (
          Object.entries(groupedByFile).map(([fileId, testsInFile]) => {
            const isCollapsed = collapsedFiles[fileId];
            const filePassed = testsInFile.filter((t) => t.status === "passed").length;
            const fileFailed = testsInFile.filter((t) => t.status === "failed").length;

            return (
              <div key={fileId} className="border border-white/5 rounded-md overflow-hidden bg-black/20">
                {/* File Header */}
                <div
                  onClick={() => toggleFileCollapse(fileId)}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer text-[11px] transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                    )}
                    <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToFile(fileId);
                      }}
                      className="font-mono text-white/80 hover:text-blue-400 truncate cursor-pointer"
                      title={`Jump to ${fileId}`}
                    >
                      {fileId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 flex-shrink-0">
                    {filePassed > 0 && <span className="text-[#34d399] font-medium">{filePassed}✓</span>}
                    {fileFailed > 0 && <span className="text-[#f87171] font-medium">{fileFailed}✗</span>}
                    <span className="text-white/20">({testsInFile.length})</span>
                  </div>
                </div>

                {/* Tests List inside file */}
                {!isCollapsed && (
                  <div className="py-1 flex flex-col gap-0.5">
                    {testsInFile.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => jumpToFile(t.fileId)}
                        className="group flex flex-col px-3 py-1.5 hover:bg-white/5 cursor-pointer rounded transition mx-1"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {t.status === "idle" && (
                              <CircleDot className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                            )}
                            {t.status === "running" && (
                              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                            )}
                            {t.status === "passed" && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] flex-shrink-0" />
                            )}
                            {t.status === "failed" && (
                              <XCircle className="w-3.5 h-3.5 text-[#f87171] flex-shrink-0" />
                            )}
                            <span className="text-white/90 group-hover:text-white truncate text-[11px]">
                              {t.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {t.durationMs !== undefined && (
                              <span className="text-[10px] text-white/30 font-mono">
                                {t.durationMs}ms
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleRunSingle(e, t)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
                              title="Run this test"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </button>
                          </div>
                        </div>

                        {/* Error detail */}
                        {t.error && (
                          <div className="mt-1 pl-5 text-[10px] text-[#ff6b6b] font-mono break-all bg-red-500/10 p-1.5 rounded flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-red-400" />
                            <span>{t.error}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/40 flex items-center justify-between flex-shrink-0">
        <span>In-browser assertions</span>
        <button
          type="button"
          onClick={handleCreateTestFile}
          className="text-[#3794ff] hover:underline cursor-pointer bg-transparent border-none p-0"
        >
          + new test
        </button>
      </div>
    </div>
  );
}

export default TestingPanel;
