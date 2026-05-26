# 将开放域脚本与资源部署到 WxProgrom/openDataContext（微信小游戏根目录）
param(
    [string]$TargetDir = "E:\BallOpenDataContext\WxProgrom\openDataContext",
    [string]$PoolClientAssets = "F:\PoolBallNew\client2\assets"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$srcOd = Join-Path $root "scripts\openDataContext"
$srcEngine = Join-Path $root "scripts\libs\engine.js"
$srcImg = Join-Path $root "assets\image"

if (-not (Test-Path $srcOd)) { throw "Missing source: $srcOd" }
if (-not (Test-Path $srcEngine)) { throw "Missing engine: $srcEngine" }
if (-not (Test-Path (Join-Path $srcOd "weapp-adapter.js"))) { throw "Missing weapp-adapter: $srcOd\weapp-adapter.js" }

if (Test-Path $TargetDir) { Remove-Item $TargetDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $TargetDir "render"), (Join-Path $TargetDir "image") | Out-Null

Copy-Item (Join-Path $srcOd "index.js") $TargetDir -Force
Copy-Item (Join-Path $srcOd "weapp-adapter.js") $TargetDir -Force
Copy-Item (Join-Path $srcOd "render\style.js") (Join-Path $TargetDir "render\style.js") -Force
Copy-Item (Join-Path $srcOd "render\tplfn.js") (Join-Path $TargetDir "render\tplfn.js") -Force
Copy-Item (Join-Path $srcOd "render\assets.js") (Join-Path $TargetDir "render\assets.js") -Force
Copy-Item $srcEngine (Join-Path $TargetDir "engine.js") -Force

foreach ($name in @("icon_800000.png", "ui_btn_yellow.png", "ui_lt_dgx.png")) {
    $p = Join-Path $srcImg $name
    if (Test-Path $p) { Copy-Item $p (Join-Path $TargetDir "image\$name") -Force }
}

$poolOverrides = @{
    "ui_btn_yellow.png" = Join-Path $PoolClientAssets "ui\atlas\common\button\newbutton\ui_btn_yellow.png"
    "ui_lt_dgx.png"     = Join-Path $PoolClientAssets "ui\atlas\module\poolGameRoom\roomCreateNew\ui_lt_dgx.png"
    "icon_800000.png"   = Join-Path $PoolClientAssets "ui\image\headIcon\icon_800000.png"
}
foreach ($kv in $poolOverrides.GetEnumerator()) {
    if (Test-Path $kv.Value) {
        Copy-Item $kv.Value (Join-Path $TargetDir "image\$($kv.Key)") -Force
    }
}

Write-Host "Deployed openDataContext -> $TargetDir"
Get-ChildItem $TargetDir -Recurse | ForEach-Object { Write-Host "  $($_.FullName)" }
