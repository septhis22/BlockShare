$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$contractsPath = Join-Path $root 'smart-contracts'
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$hardhatWindow = $null

function Start-ProjectTerminal {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Command
    )

    Start-Process -FilePath 'cmd.exe' `
        -ArgumentList @('/k', $Command) `
        -WorkingDirectory $WorkingDirectory | Out-Null
}

if (-not (Test-Path (Join-Path $contractsPath 'node_modules'))) {
    throw 'smart-contracts dependencies are missing. Run npm install in smart-contracts first.'
}
if (-not (Test-Path (Join-Path $backendPath 'node_modules'))) {
    throw 'backend dependencies are missing. Run npm install in backend first.'
}
if (-not (Test-Path (Join-Path $frontendPath 'node_modules'))) {
    throw 'frontend dependencies are missing. Run npm install in frontend first.'
}

Write-Host 'Starting the local Hardhat chain...'
$hardhatWindow = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList @('/k', 'npx hardhat node') `
    -WorkingDirectory $contractsPath `
    -PassThru

$rpcBody = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
$deadline = (Get-Date).AddSeconds(60)
$chainReady = $false

while ((Get-Date) -lt $deadline) {
    try {
        $rpcResponse = Invoke-RestMethod `
            -Uri 'http://127.0.0.1:8545' `
            -Method Post `
            -ContentType 'application/json' `
            -Body $rpcBody `
            -TimeoutSec 2

        if ($rpcResponse.result -eq '0x7a69') {
            $chainReady = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $chainReady) {
    if ($hardhatWindow) {
        & taskkill.exe /PID $hardhatWindow.Id /T /F | Out-Null
    }
    throw 'Hardhat did not become ready on http://127.0.0.1:8545 within 60 seconds.'
}

Write-Host 'Hardhat is ready. Deploying Registry first to preserve the frontend address...'
Push-Location $contractsPath
try {
    & npx.cmd hardhat run scripts/deployRegistry.ts --network localhost
    if ($LASTEXITCODE -ne 0) {
        throw 'Registry deployment failed.'
    }

    & npx.cmd hardhat run scripts/deployWalletTextRegistry.ts --network localhost
    if ($LASTEXITCODE -ne 0) {
        throw 'WalletTextRegistry deployment failed.'
    }
} finally {
    Pop-Location
}

Write-Host 'Starting backend (nodemon) and frontend (Vite HMR) dev servers...'
Start-ProjectTerminal -WorkingDirectory $backendPath -Command 'npm run dev'
Start-ProjectTerminal -WorkingDirectory $frontendPath -Command 'npm run dev'

Write-Host ''
Write-Host 'BlockShare local environment is running:'
Write-Host '  Hardhat RPC: http://127.0.0.1:8545 (chain ID 31337)'
Write-Host '  Backend:     http://localhost:5000'
Write-Host '  Frontend:    http://localhost:5173'
Write-Host '  Backend watches src/ and .env; Vite hot-reloads frontend changes.'
Write-Host '  Solidity edits require redeployment; restarting Hardhat resets local chain state.'
Write-Host 'Close the opened terminal windows to stop the processes.'
