# Instala a skill sensei no Claude Code e no DeepSeek Harness (Windows).
# Uso: .\install.ps1 [-Scope user|project] [-Copy] [-Bin] [-Uninstall] [-Force]
param(
  [ValidateSet("user", "project")]
  [string]$Scope = "user",
  [switch]$Copy,
  [switch]$Bin,
  [switch]$Uninstall,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = (Resolve-Path (Join-Path $ScriptDir "skills\sensei")).Path
$PluginDir = (Resolve-Path $ScriptDir).Path

if (-not (Test-Path (Join-Path $SkillDir "SKILL.md"))) {
  Write-Error "pacote incompleto em $SkillDir"
  exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "node nao encontrado (requer Node 18+)"
  exit 1
}
$Major = [int](node -p "process.versions.node.split('.')[0]")
if ($Major -lt 18) {
  Write-Error "Node $Major encontrado; requer 18+"
  exit 1
}

if ($Scope -eq "project") {
  $Base = (Get-Location).Path
  $AgentsDir = Join-Path $Base ".agents\skills"
  $ClaudeDir = Join-Path $Base ".claude\skills"
} else {
  $AgentsDir = Join-Path $HOME ".agents\skills"
  $ClaudeDir = Join-Path $HOME ".claude\skills"
}

function Points-Here($Dest) {
  if (-not (Test-Path $Dest)) { return $false }
  $item = Get-Item $Dest -Force
  if (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { return $false }
  $target = $item.Target
  if ($null -eq $target) { return $false }
  return ((Resolve-Path $target).Path -eq $SkillDir)
}

function Install-One($Dest, $Label) {
  $ours = (Test-Path (Join-Path $Dest ".sensei-installed")) -or (Points-Here $Dest)

  if ($Uninstall) {
    if (Points-Here $Dest) {
      Remove-Item $Dest -Force
      Write-Host "removido $Label ($Dest)"
    } elseif ((Test-Path $Dest) -and (Test-Path (Join-Path $Dest ".sensei-installed"))) {
      Remove-Item $Dest -Recurse -Force
      Write-Host "removido $Label ($Dest)"
    } else {
      Write-Host "skip    $Label ($Dest)"
    }
    return
  }

  if ((Test-Path $Dest) -and -not $ours) {
    if (-not $Force) {
      Write-Warning "$Label destino existe e nao e nosso -> $Dest (use -Force)"
      return
    }
    Remove-Item $Dest -Recurse -Force
  } elseif ((Test-Path $Dest) -and $ours) {
    Remove-Item $Dest -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Dest) | Out-Null
  if (-not $Copy) {
    try {
      New-Item -ItemType SymbolicLink -Path $Dest -Target $SkillDir | Out-Null
      Write-Host "link    $Label ($Dest -> $SkillDir)"
      return
    } catch {
      Write-Warning "symlink indisponivel; copiando (rode como admin ou use -Copy)"
    }
  }
  Copy-Item -Recurse -Force $SkillDir $Dest
  Set-Content -Path (Join-Path $Dest ".sensei-installed") -Value "installed by sensei" -Encoding UTF8
  Write-Host "copiado $Label ($Dest)"
}

Write-Host "sensei · scope=$Scope"
Install-One (Join-Path $AgentsDir "sensei") "DeepSeek Harness (~/.agents)"
Install-One (Join-Path $ClaudeDir "sensei") "Claude Code (~/.claude)"

$BinDir = Join-Path $HOME ".local\bin"
$BinFile = Join-Path $BinDir "rx.cmd"
if ($Uninstall) {
  if (Test-Path $BinFile) {
    $content = Get-Content $BinFile -Raw
    if ($content -match "sensei\.mjs") { Remove-Item $BinFile -Force; Write-Host "removido CLI ($BinFile)" }
    else { Write-Host "skip    CLI ($BinFile)" }
  }
} elseif ($Bin) {
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  $node = (Get-Command node).Source
  $sensei = Join-Path $SkillDir "scripts\sensei.mjs"
  $cmdLine = '@echo off' + [Environment]::NewLine + '"' + $node + '" "' + $sensei + '" %*'
  Set-Content -Path $BinFile -Value $cmdLine -Encoding ASCII
  Write-Host "criado  CLI ($BinFile)"
}

if ($Uninstall) {
  Write-Host "Pronto. Abra uma nova sessao para o catalogo refletir a remocao."
  exit 0
}

Write-Host ""
Write-Host "Proximo passo: abra uma nova sessao e use /sensei review (ou peça 'revise o diff')."
Write-Host "Historico: sensei stats --last 5 (se -Bin foi usado)."
