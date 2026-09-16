$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$releaseRoot = Join-Path $projectRoot 'release'
$stagingRoot = Join-Path $projectRoot 'test-output/MEL-Generator-1.0.0-source'
if (Test-Path -LiteralPath $stagingRoot) {
    throw 'Source staging directory already exists. Choose a fresh staging directory before packaging.'
}
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
$items = @('desktop', 'core', 'ui', 'data', 'resources', 'scripts', 'tests', 'design',
    'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc', '.gitignore',
    'README.md', 'Boundaries.md', 'Suggestions.md',
    'research_fenix/efb_mmel_pool', 'sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf')
foreach ($item in $items) {
    $sourcePath = Join-Path $projectRoot $item
    $destinationPath = Join-Path $stagingRoot $item
    New-Item -ItemType Directory -Path (Split-Path $destinationPath -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse
}
Copy-Item -LiteralPath (Join-Path $releaseRoot 'TEST-REPORT.md') -Destination $stagingRoot
$archivePath = Join-Path $releaseRoot 'MEL-Generator-1.0.0-source.zip'
Compress-Archive -LiteralPath $stagingRoot -DestinationPath $archivePath -CompressionLevel Optimal
Write-Output $archivePath
