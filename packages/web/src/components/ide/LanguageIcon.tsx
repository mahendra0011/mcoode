"use client";
import React, { useState } from "react";
import {
  SiPython,
  SiJavascript,
  SiTypescript,
  SiC,
  SiCplusplus,
  SiGo,
  SiRust,
  SiRuby,
  SiKotlin,
  SiSwift,
  SiPhp,
  SiLua,
  SiPerl,
  SiR,
  SiScala,
  SiHaskell,
  SiElixir,
  SiDart,
  SiJulia,
  SiHtml5,
  SiSass,
  SiVuedotjs,
  SiSvelte,
  SiAstro,
  SiGnubash,
  SiDeno,
  SiDocker,
  SiTerraform,
  SiPacker,
  SiHashicorp,
  SiNixos,
  SiYaml,
  SiToml,
  SiMarkdown,
  SiSolidity,
  SiJupyter,
  SiPostgresql,
  SiFortran,
  SiApple,
  SiWebassembly,
} from "react-icons/si";
import { DiJava } from "react-icons/di";
import { TbBrandCSharp, TbBrandCss3, TbCode } from "react-icons/tb";

interface LanguageIconProps {
  id: string;
  name: string;
  className?: string;
  color?: string;
}

// Official Devicon colored SVG CDN mapping for full-color brand logos
const DEVICON_URLS: Record<string, string> = {
  python: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
  javascript: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
  typescript: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg",
  java: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
  c: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg",
  cpp: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg",
  cplusplus: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg",
  csharp: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg",
  go: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg",
  rust: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rust/rust-original.svg",
  ruby: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ruby/ruby-original.svg",
  kotlin: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kotlin/kotlin-original.svg",
  swift: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/swift/swift-original.svg",
  php: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg",
  lua: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/lua/lua-original.svg",
  perl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/perl/perl-original.svg",
  r: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/r/r-original.svg",
  scala: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/scala/scala-original.svg",
  haskell: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/haskell/haskell-original.svg",
  elixir: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/elixir/elixir-original.svg",
  dart: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dart/dart-original.svg",
  julia: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/julia/julia-original.svg",
  html: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg",
  css: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg",
  scss: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sass/sass-original.svg",
  vue: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vuejs/vuejs-original.svg",
  svelte: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/svelte/svelte-original.svg",
  astro: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/astro/astro-original.svg",
  bash: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/bash/bash-original.svg",
  dockerfile: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
  terraform: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/terraform/terraform-original.svg",
  packer: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/packer/packer-original.svg",
  nix: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nixos/nixos-original.svg",
  yaml: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/yaml/yaml-original.svg",
  markdown: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/markdown/markdown-original.svg",
  solidity: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/solidity/solidity-original.svg",
  jupyter: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jupyter/jupyter-original.svg",
  sql: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg",
  deno: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/denojs/denojs-original.svg",
};

/**
 * LanguageIcon Component
 * Renders authentic, high-res developer logos from official library icons (react-icons + Devicon CDN)
 */
export function LanguageIcon({ id, name, className = "w-6 h-6", color }: LanguageIconProps) {
  const [imgError, setImgError] = useState(false);
  const norm = (id || name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const cdnUrl = DEVICON_URLS[norm] || DEVICON_URLS[id] || (norm.includes("bash") || norm.includes("shell") ? DEVICON_URLS.bash : null);

  // If Devicon CDN logo is available and hasn't errored, render authentic colored SVG logo
  if (cdnUrl && !imgError) {
    return (
      <img
        src={cdnUrl}
        alt={name}
        className={`${className} object-contain flex-shrink-0`}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  // React Icons library components fallback with official brand colors
  const sizeClass = className;

  if (norm.includes("python")) return <SiPython className={sizeClass} style={{ color: "#3776AB" }} />;
  if (norm === "javascript" || norm === "js") return <SiJavascript className={sizeClass} style={{ color: "#F7DF1E" }} />;
  if (norm === "typescript" || norm === "ts") return <SiTypescript className={sizeClass} style={{ color: "#3178C6" }} />;
  if (norm === "java") return <DiJava className={sizeClass} style={{ color: "#E76F00" }} />;
  if (norm === "c") return <SiC className={sizeClass} style={{ color: "#A8B9CC" }} />;
  if (norm === "cpp" || norm === "cplusplus") return <SiCplusplus className={sizeClass} style={{ color: "#00599C" }} />;
  if (norm === "csharp" || norm === "cs") return <TbBrandCSharp className={sizeClass} style={{ color: "#239120" }} />;
  if (norm === "go" || norm === "golang") return <SiGo className={sizeClass} style={{ color: "#00ADD8" }} />;
  if (norm === "rust" || norm === "rs") return <SiRust className={sizeClass} style={{ color: "#DEA584" }} />;
  if (norm === "ruby" || norm === "rb") return <SiRuby className={sizeClass} style={{ color: "#CC342D" }} />;
  if (norm === "kotlin" || norm === "kt") return <SiKotlin className={sizeClass} style={{ color: "#7F52FF" }} />;
  if (norm === "swift") return <SiSwift className={sizeClass} style={{ color: "#F05138" }} />;
  if (norm === "php") return <SiPhp className={sizeClass} style={{ color: "#777BB4" }} />;
  if (norm === "lua") return <SiLua className={sizeClass} style={{ color: "#000080" }} />;
  if (norm === "perl" || norm === "pl") return <SiPerl className={sizeClass} style={{ color: "#39457E" }} />;
  if (norm === "r") return <SiR className={sizeClass} style={{ color: "#276DC3" }} />;
  if (norm === "scala") return <SiScala className={sizeClass} style={{ color: "#DC322F" }} />;
  if (norm === "haskell" || norm === "hs") return <SiHaskell className={sizeClass} style={{ color: "#5D4F85" }} />;
  if (norm === "elixir" || norm === "ex") return <SiElixir className={sizeClass} style={{ color: "#4B275F" }} />;
  if (norm === "dart") return <SiDart className={sizeClass} style={{ color: "#0175C2" }} />;
  if (norm === "julia" || norm === "jl") return <SiJulia className={sizeClass} style={{ color: "#9558B2" }} />;
  if (norm === "html") return <SiHtml5 className={sizeClass} style={{ color: "#E34F26" }} />;
  if (norm === "css") return <TbBrandCss3 className={sizeClass} style={{ color: "#1572B6" }} />;
  if (norm === "scss") return <SiSass className={sizeClass} style={{ color: "#CC6699" }} />;
  if (norm === "vue") return <SiVuedotjs className={sizeClass} style={{ color: "#4FC08D" }} />;
  if (norm === "svelte") return <SiSvelte className={sizeClass} style={{ color: "#FF3E00" }} />;
  if (norm === "astro") return <SiAstro className={sizeClass} style={{ color: "#BC52EE" }} />;
  if (norm.includes("bash") || norm.includes("shell") || norm === "sh") return <SiGnubash className={sizeClass} style={{ color: "#4EAA25" }} />;
  if (norm === "deno") return <SiDeno className={sizeClass} style={{ color: "#FFFFFF" }} />;
  if (norm.includes("docker")) return <SiDocker className={sizeClass} style={{ color: "#2496ED" }} />;
  if (norm.includes("terraform")) return <SiTerraform className={sizeClass} style={{ color: "#844FBA" }} />;
  if (norm.includes("packer")) return <SiPacker className={sizeClass} style={{ color: "#02A8EF" }} />;
  if (norm.includes("hcl")) return <SiHashicorp className={sizeClass} style={{ color: "#844FBA" }} />;
  if (norm === "nix") return <SiNixos className={sizeClass} style={{ color: "#5277C3" }} />;
  if (norm === "yaml") return <SiYaml className={sizeClass} style={{ color: "#CB171E" }} />;
  if (norm === "toml") return <SiToml className={sizeClass} style={{ color: "#9C4221" }} />;
  if (norm.includes("markdown") || norm === "md") return <SiMarkdown className={sizeClass} style={{ color: "#083FA1" }} />;
  if (norm.includes("solidity")) return <SiSolidity className={sizeClass} style={{ color: "#363636" }} />;
  if (norm.includes("jupyter") || norm.includes("ipynb")) return <SiJupyter className={sizeClass} style={{ color: "#F37626" }} />;
  if (norm === "sql") return <SiPostgresql className={sizeClass} style={{ color: "#4169E1" }} />;
  if (norm.includes("objective")) return <SiApple className={sizeClass} style={{ color: "#A2AAAD" }} />;
  if (norm.includes("assembly") || norm === "asm") return <SiWebassembly className={sizeClass} style={{ color: "#654FF0" }} />;
  if (norm.includes("fortran")) return <SiFortran className={sizeClass} style={{ color: "#734F96" }} />;

  // Crisp fallback badge for esoteric/other languages
  const initials = (name || id || "").slice(0, 3).toUpperCase();
  return (
    <div
      className={`${sizeClass} rounded flex items-center justify-center text-[10px] font-bold text-white font-mono shadow-sm flex-shrink-0`}
      style={{ backgroundColor: color || "#0078D4" }}
    >
      {initials.length <= 2 ? initials : <TbCode className="w-4 h-4" />}
    </div>
  );
}

export default LanguageIcon;
