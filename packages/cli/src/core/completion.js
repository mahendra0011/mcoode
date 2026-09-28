export function generateCompletionScript(program, shell) {
  const commands = program.commands
    .map((c) => c.name())
    .filter((n) => n !== 'completion' && n !== 'help');
  const options = program.options.map((o) => o.long).filter(Boolean);

  if (shell === 'bash') {
    return `# bash completion for mcode
_mcode() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmds="${commands.join(' ')}"
  local opts="${options.join(' ')}"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${cmds}" -- "\${cur}"))
  else
    COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
  fi
}
complete -F _mcode mcode
`;
  }
  if (shell === 'zsh') {
    return `# zsh completion for mcode
#compdef mcode
_mcode() {
  local -a cmds
  cmds=(${commands.map((c) => `'${c}'`).join(' ')})
  _arguments -C '1:command:->command' '*:option:->option'
  case $state in
    command) _describe 'command' cmds ;;
    option) _arguments '*:option:->option' ;;
  esac
}
_mcode "$@"
`;
  }
  if (shell === 'fish') {
    return `# fish completion for mcode
${commands.map((c) => `complete -c mcode -n '__fish_use_subcommand' -a '${c}'`).join('\n')}
${options.map((o) => `complete -c mcode -o '${o.replace(/^--/, '')}'`).join('\n')}
`;
  }
  return '';
}
