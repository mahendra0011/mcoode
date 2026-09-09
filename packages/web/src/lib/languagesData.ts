export interface LanguageItem {
  id: string;
  name: string;
  category:
    | "Mainstream"
    | "Web / Frontend"
    | "Scripting / Shell"
    | "Mobile / System"
    | "Functional / Academic"
    | "Infra / DevOps"
    | "Blockchain"
    | "Data Science"
    | "Database"
    | "Esoteric";
  extension: string;
  color: string;
  defaultBoilerplate?: string;
}

export const ALL_LANGUAGES: LanguageItem[] = [
  // 1. Mainstream / General Purpose
  { id: "python", name: "Python", category: "Mainstream", extension: ".py", color: "#3572A5", defaultBoilerplate: "def main():\n    print('Hello, Python!')\n\nif __name__ == '__main__':\n    main()\n" },
  { id: "javascript", name: "JavaScript", category: "Mainstream", extension: ".js", color: "#F7DF1E", defaultBoilerplate: "console.log('Hello, JavaScript!');\n" },
  { id: "typescript", name: "TypeScript", category: "Mainstream", extension: ".ts", color: "#3178C6", defaultBoilerplate: "const greeting: string = 'Hello, TypeScript!';\nconsole.log(greeting);\n" },
  { id: "java", name: "Java", category: "Mainstream", extension: ".java", color: "#b07219", defaultBoilerplate: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, Java!\");\n    }\n}\n" },
  { id: "c", name: "C", category: "Mainstream", extension: ".c", color: "#555555", defaultBoilerplate: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, C!\\n\");\n    return 0;\n}\n" },
  { id: "cpp", name: "C++", category: "Mainstream", extension: ".cpp", color: "#f34b7d", defaultBoilerplate: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, C++!\" << std::endl;\n    return 0;\n}\n" },
  { id: "csharp", name: "C#", category: "Mainstream", extension: ".cs", color: "#178600", defaultBoilerplate: "using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello, C#!\");\n    }\n}\n" },
  { id: "go", name: "Go", category: "Mainstream", extension: ".go", color: "#00ADD8", defaultBoilerplate: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, Go!\")\n}\n" },
  { id: "rust", name: "Rust", category: "Mainstream", extension: ".rs", color: "#dea584", defaultBoilerplate: "fn main() {\n    println!(\"Hello, Rust!\");\n}\n" },
  { id: "ruby", name: "Ruby", category: "Mainstream", extension: ".rb", color: "#701516", defaultBoilerplate: "puts 'Hello, Ruby!'\n" },
  { id: "kotlin", name: "Kotlin", category: "Mainstream", extension: ".kt", color: "#A97BFF", defaultBoilerplate: "fun main() {\n    println(\"Hello, Kotlin!\")\n}\n" },
  { id: "swift", name: "Swift", category: "Mainstream", extension: ".swift", color: "#F05138", defaultBoilerplate: "print(\"Hello, Swift!\")\n" },
  { id: "php", name: "PHP", category: "Mainstream", extension: ".php", color: "#4F5D95", defaultBoilerplate: "<?php\necho \"Hello, PHP!\\n\";\n" },
  { id: "lua", name: "Lua", category: "Mainstream", extension: ".lua", color: "#000080", defaultBoilerplate: "print('Hello, Lua!')\n" },
  { id: "perl", name: "Perl", category: "Mainstream", extension: ".pl", color: "#0298c3", defaultBoilerplate: "print \"Hello, Perl!\\n\";\n" },
  { id: "r", name: "R", category: "Mainstream", extension: ".r", color: "#198CE7", defaultBoilerplate: "cat('Hello, R!\\n')\n" },
  { id: "scala", name: "Scala", category: "Mainstream", extension: ".scala", color: "#c22d40", defaultBoilerplate: "object Main extends App {\n  println(\"Hello, Scala!\")\n}\n" },
  { id: "haskell", name: "Haskell", category: "Mainstream", extension: ".hs", color: "#5e5086", defaultBoilerplate: "main :: IO ()\nmain = putStrLn \"Hello, Haskell!\"\n" },
  { id: "elixir", name: "Elixir", category: "Mainstream", extension: ".ex", color: "#6e4a7e", defaultBoilerplate: "IO.puts \"Hello, Elixir!\"\n" },
  { id: "dart", name: "Dart", category: "Mainstream", extension: ".dart", color: "#00B4AB", defaultBoilerplate: "void main() {\n  print('Hello, Dart!');\n}\n" },
  { id: "julia", name: "Julia", category: "Mainstream", extension: ".jl", color: "#a270ba", defaultBoilerplate: "println(\"Hello, Julia!\")\n" },

  // 2. Web / Frontend
  { id: "html", name: "HTML", category: "Web / Frontend", extension: ".html", color: "#e34c26", defaultBoilerplate: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>M Code Project</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n" },
  { id: "css", name: "CSS", category: "Web / Frontend", extension: ".css", color: "#563d7c", defaultBoilerplate: "body {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n}\n" },
  { id: "scss", name: "SCSS", category: "Web / Frontend", extension: ".scss", color: "#c6538c", defaultBoilerplate: "$primary: #3b82f6;\n\nbody {\n  color: $primary;\n}\n" },
  { id: "vue", name: "Vue", category: "Web / Frontend", extension: ".vue", color: "#41b883", defaultBoilerplate: "<template>\n  <div>Hello, Vue!</div>\n</template>\n\n<script setup>\n</script>\n" },
  { id: "svelte", name: "Svelte", category: "Web / Frontend", extension: ".svelte", color: "#ff3e00", defaultBoilerplate: "<script>\n  let name = 'Svelte';\n</script>\n\n<h1>Hello {name}!</h1>\n" },
  { id: "astro", name: "Astro", category: "Web / Frontend", extension: ".astro", color: "#ff5d01", defaultBoilerplate: "---\n---\n<html>\n  <body>\n    <h1>Hello, Astro!</h1>\n  </body>\n</html>\n" },

  // 3. Scripting / Shell
  { id: "bash", name: "Shell Script (Bash)", category: "Scripting / Shell", extension: ".sh", color: "#89e051", defaultBoilerplate: "#!/usr/bin/env bash\nset -euo pipefail\n\necho \"Hello from Bash!\"\n" },
  { id: "makefile", name: "Makefile", category: "Scripting / Shell", extension: "Makefile", color: "#427819", defaultBoilerplate: "all:\n\t@echo \"Building...\"\n" },
  { id: "deno", name: "Deno", category: "Scripting / Shell", extension: ".ts", color: "#000000", defaultBoilerplate: "Deno.serve((_req) => new Response('Hello, Deno!'));\n" },

  // 4. Mobile / Low-level / System
  { id: "objective-c", name: "Objective-C", category: "Mobile / System", extension: ".m", color: "#438eff", defaultBoilerplate: "#import <Foundation/Foundation.h>\n\nint main(int argc, const char * argv[]) {\n    @autoreleasepool {\n        NSLog(@\"Hello, Objective-C!\");\n    }\n    return 0;\n}\n" },
  { id: "objective-cpp", name: "Objective-C++", category: "Mobile / System", extension: ".mm", color: "#6866fb", defaultBoilerplate: "#import <Foundation/Foundation.h>\n#include <iostream>\n\nint main() {\n    std::cout << \"Hello, Objective-C++!\" << std::endl;\n    return 0;\n}\n" },
  { id: "assembly", name: "Assembly", category: "Mobile / System", extension: ".asm", color: "#6E4C13", defaultBoilerplate: "section .text\n    global _start\n_start:\n    mov eax, 1\n    int 0x80\n" },

  // 5. Functional / Classic / Academic
  { id: "scheme", name: "Scheme", category: "Functional / Academic", extension: ".scm", color: "#1e4aec", defaultBoilerplate: "(display \"Hello, Scheme!\")\n(newline)\n" },
  { id: "racket", name: "Racket", category: "Functional / Academic", extension: ".rkt", color: "#3c5caa", defaultBoilerplate: "#lang racket\n(displayln \"Hello, Racket!\")\n" },
  { id: "forth", name: "Forth", category: "Functional / Academic", extension: ".fth", color: "#341708", defaultBoilerplate: ".( Hello, Forth! ) CR\n" },
  { id: "quickbasic", name: "Quick Basic", category: "Functional / Academic", extension: ".bas", color: "#008080", defaultBoilerplate: "PRINT \"Hello, Quick Basic!\"\nEND\n" },
  { id: "cobol", name: "COBOL", category: "Functional / Academic", extension: ".cbl", color: "#002B36", defaultBoilerplate: "       IDENTIFICATION DIVISION.\n       PROGRAM-ID. HELLO.\n       PROCEDURE DIVISION.\n           DISPLAY 'Hello, COBOL!'.\n           STOP RUN.\n" },
  { id: "fortran", name: "Fortran", category: "Functional / Academic", extension: ".f90", color: "#4d41b1", defaultBoilerplate: "program hello\n  print *, 'Hello, Fortran!'\nend program hello\n" },

  // 6. Infra / DevOps / Config
  { id: "dockerfile", name: "Dockerfile", category: "Infra / DevOps", extension: "Dockerfile", color: "#384d54", defaultBoilerplate: "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD [\"node\", \"index.js\"]\n" },
  { id: "terraform", name: "Terraform (HCL)", category: "Infra / DevOps", extension: ".tf", color: "#844FBA", defaultBoilerplate: "terraform {\n  required_version = \">= 1.0\"\n}\n" },
  { id: "packer", name: "Packer", category: "Infra / DevOps", extension: ".pkr.hcl", color: "#00AC46", defaultBoilerplate: "packer {\n  required_plugins {}\n}\n" },
  { id: "hcl", name: "HashiCorp Configuration Language", category: "Infra / DevOps", extension: ".hcl", color: "#844FBA", defaultBoilerplate: "variable \"env\" {\n  default = \"dev\"\n}\n" },
  { id: "nix", name: "Nix", category: "Infra / DevOps", extension: ".nix", color: "#7e7eff", defaultBoilerplate: "{ pkgs ? import <nixpkgs> {} }:\npkgs.mkShell {\n  buildInputs = [ pkgs.nodejs ];\n}\n" },
  { id: "yaml", name: "YAML", category: "Infra / DevOps", extension: ".yaml", color: "#cb171e", defaultBoilerplate: "version: '1.0'\nservices:\n  web:\n    image: nginx\n" },
  { id: "toml", name: "TOML", category: "Infra / DevOps", extension: ".toml", color: "#9c4221", defaultBoilerplate: "[package]\nname = \"mcode-app\"\nversion = \"0.1.0\"\n" },
  { id: "markdown", name: "Markdown", category: "Infra / DevOps", extension: ".md", color: "#083fa1", defaultBoilerplate: "# Project Documentation\n\nWelcome to M Code.\n" },

  // 7. Blockchain
  { id: "solidity", name: "Solidity", category: "Blockchain", extension: ".sol", color: "#AA6746", defaultBoilerplate: "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract MyContract {\n    string public name = \"MCode\";\n}\n" },
  { id: "move", name: "Move", category: "Blockchain", extension: ".move", color: "#4B92DB", defaultBoilerplate: "module 0x1::hello {\n    use std::string;\n}\n" },

  // 8. Data Science
  { id: "jupyter", name: "Jupyter Notebook", category: "Data Science", extension: ".ipynb", color: "#DA5B0B", defaultBoilerplate: "{\n \"cells\": [],\n \"metadata\": {},\n \"nbformat\": 4,\n \"nbformat_minor\": 2\n}\n" },

  // 9. Database
  { id: "sql", name: "SQL", category: "Database", extension: ".sql", color: "#e38c00", defaultBoilerplate: "SELECT * FROM users LIMIT 10;\n" },

  // 10. Esoteric
  { id: "brainfuck", name: "Brainfuck", category: "Esoteric", extension: ".bf", color: "#2b2b2b", defaultBoilerplate: "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.\n" },
  { id: "lolcode", name: "LOLCODE", category: "Esoteric", extension: ".lol", color: "#cc9900", defaultBoilerplate: "HAI 1.2\n  CAN HAS STDIO?\n  VISIBLE \"HAI WORLD!\"\nKTHXBYE\n" },
  { id: "unlambda", name: "Unlambda", category: "Esoteric", extension: ".unl", color: "#666666", defaultBoilerplate: "```s``s`ks``s`k`s`ks``s`k`s`k`s`ks``s`k`s`k`s`k`s`ks`k.H`k.e`k.l`k.l`k.o\n" }
];
