$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$localDotnet = Join-Path $repositoryRoot 'development\tools\dotnet\dotnet.exe'
$dotnet = if (Test-Path -LiteralPath $localDotnet) { $localDotnet } else { 'dotnet' }
$project = Join-Path $repositoryRoot 'production\service\MelGenerator.IntegrationService\MelGenerator.IntegrationService.csproj'
$output = Join-Path $repositoryRoot 'production\integration\service'

$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
& $dotnet publish $project --configuration Release --runtime win-x64 --self-contained true --output $output
if ($LASTEXITCODE -ne 0) { throw "Integration Service publish failed with exit code $LASTEXITCODE." }

Get-ChildItem -LiteralPath $output -Filter '*.pdb' -File | Remove-Item -Force
$dataOutput = Join-Path $output 'data'
New-Item -ItemType Directory -Force -Path $dataOutput | Out-Null
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'production\data\catalog.json') -Destination $dataOutput -Force
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'production\data\rules.json') -Destination $dataOutput -Force
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'production\integration\fenix-mapping.json') -Destination $dataOutput -Force
