import { MonacoSnippet } from '../../editorApi';

export const reactSnippets: MonacoSnippet[] = [
  {
    label: 'rafce',
    insertText: 'import React from \'react\';\n\nconst ${1:ComponentName} = () => {\n  return (\n    <div>\n      ${2:Content}\n    </div>\n  );\n};\n\nexport default ${1:ComponentName};\n',
    detail: 'React Arrow Function Component with Export',
  },
  {
    label: 'rfc',
    insertText: 'export default function ${1:ComponentName}() {\n  return (\n    <div>\n      ${2:Content}\n    </div>\n  );\n}\n',
    detail: 'React Standard Function Component',
  },
  {
    label: 'useState',
    insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialState});',
    detail: 'React useState Hook',
  },
  {
    label: 'useEffect',
    insertText: 'useEffect(() => {\n  ${1:// effect}\n  return () => {\n    ${2:// cleanup}\n  };\n}, [${3:deps}]);',
    detail: 'React useEffect Hook',
  },
  {
    label: 'useCallback',
    insertText: 'const ${1:memoizedCallback} = useCallback(() => {\n  ${2:// logic}\n}, [${3:deps}]);',
    detail: 'React useCallback Hook',
  },
  {
    label: 'useMemo',
    insertText: 'const ${1:memoizedValue} = useMemo(() => {\n  return ${2:computedValue};\n}, [${3:deps}]);',
    detail: 'React useMemo Hook',
  },
];

export const nextjsSnippets: MonacoSnippet[] = [
  {
    label: 'npage',
    insertText: 'import React from \'react\';\n\nexport default function ${1:PageName}Page() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">${2:Heading}</h1>\n    </main>\n  );\n}\n',
    detail: 'Next.js App Router Page Component',
  },
  {
    label: 'nlayout',
    insertText: 'import React from \'react\';\n\nexport default function ${1:LayoutName}Layout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return (\n    <div className="min-h-screen">\n      {children}\n    </div>\n  );\n}\n',
    detail: 'Next.js Layout Component',
  },
  {
    label: 'napi',
    insertText: 'import { NextResponse } from \'next/server\';\n\nexport async function GET(request: Request) {\n  return NextResponse.json({ message: \'Success\' });\n}\n',
    detail: 'Next.js Route Handler GET',
  },
];

export const vueSnippets: MonacoSnippet[] = [
  {
    label: 'vbase',
    insertText: '<template>\n  <div class="${1:container}">\n    <h1>{{ title }}</h1>\n  </div>\n</template>\n\n<script setup lang="ts">\nimport { ref } from \'vue\';\n\nconst title = ref(\'${2:Hello Vue}\');\n</script>\n\n<style scoped>\n</style>\n',
    detail: 'Vue 3 Single File Component (Script Setup)',
  },
  {
    label: 'vref',
    insertText: 'const ${1:name} = ref(${2:initialValue});',
    detail: 'Vue 3 ref() reactive variable',
  },
  {
    label: 'vcomputed',
    insertText: 'const ${1:computedValue} = computed(() => {\n  return ${2:value};\n});',
    detail: 'Vue 3 computed property',
  },
];

export const tailwindSnippets: MonacoSnippet[] = [
  {
    label: 'tw-flex-center',
    insertText: 'flex items-center justify-center',
    detail: 'Tailwind Flex Center utilities',
  },
  {
    label: 'tw-grid-cols',
    insertText: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    detail: 'Tailwind Responsive Grid layout',
  },
  {
    label: 'tw-card',
    insertText: 'rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg backdrop-blur-sm',
    detail: 'Tailwind Modern Card component styles',
  },
];

export const pythonSnippets: MonacoSnippet[] = [
  {
    label: 'def',
    insertText: 'def ${1:func_name}(${2:args}):\n    """${3:Docstring}"""\n    ${4:pass}\n',
    detail: 'Python function definition',
  },
  {
    label: 'class',
    insertText: 'class ${1:ClassName}:\n    def __init__(self, ${2:args}):\n        ${3:pass}\n',
    detail: 'Python class definition',
  },
  {
    label: 'main',
    insertText: 'if __name__ == "__main__":\n    ${1:main()}\n',
    detail: 'Python if __name__ == "__main__" block',
  },
];

export const htmlSnippets: MonacoSnippet[] = [
  {
    label: 'html5',
    insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:Document}</title>\n</head>\n<body>\n  ${2:}\n</body>\n</html>\n',
    detail: 'HTML5 Boilerplate Structure',
  },
];

export const testSnippets: MonacoSnippet[] = [
  {
    label: 'describe',
    insertText: 'describe(\'${1:Test Suite}\', () => {\n  it(\'${2:should behave properly}\', () => {\n    ${3:// assertion}\n  });\n});\n',
    detail: 'Testing describe block',
  },
  {
    label: 'it',
    insertText: 'it(\'${1:does something}\', () => {\n  expect(${2:actual}).toBe(${3:expected});\n});\n',
    detail: 'Testing it() block with expect',
  },
];
