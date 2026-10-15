# instalar.ps1 - instala as skills dos plugins deste repo em $HOME/.claude/skills
# Alternativa ao caminho de plugin (ver README.md). Idempotente: rodar de novo atualiza.
[CmdletBinding()]
param(
  [string]$Plugin = "",
  [string]$Destino = (Join-Path $HOME ".claude/skills"),
  [switch]$Listar
)

$Raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-Skills {
  $base = Join-Path $Raiz "plugins"
  if (-not (Test-Path $base)) { return }
  Get-ChildItem $base -Directory | ForEach-Object {
    $p = $_
    $sk = Join-Path $p.FullName "skills"
    if (Test-Path $sk) {
      Get-ChildItem $sk -Directory | ForEach-Object {
        [pscustomobject]@{ Plugin = $p.Name; Skill = $_.Name; Caminho = $_.FullName }
      }
    }
  }
}

$skills = @(Get-Skills)
if ($Listar) { $skills | Format-Table Plugin, Skill -AutoSize; return }
if ($Plugin) { $skills = @($skills | Where-Object { $_.Plugin -eq $Plugin }) }
if ($skills.Count -eq 0) {
  if ($Plugin) { Write-Error "nenhuma skill encontrada para o plugin $Plugin" }
  else { Write-Error "nenhuma skill encontrada" }
  exit 1
}

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
foreach ($s in $skills) {
  $alvo = Join-Path $Destino $s.Skill
  if ((Test-Path $alvo) -and (Test-Path (Join-Path $alvo "SKILL.md"))) {
    Remove-Item $alvo -Recurse -Force
  }
  Copy-Item $s.Caminho $alvo -Recurse -Force
  Write-Host "instalada: $($s.Plugin)/$($s.Skill) -> $alvo"
}
Write-Host "$($skills.Count) skill(s) prontas em $Destino"
