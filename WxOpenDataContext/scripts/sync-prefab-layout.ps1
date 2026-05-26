$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $ScriptDir "prefab-to-style.js") @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
