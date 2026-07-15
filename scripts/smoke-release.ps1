[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Archive,

    [Parameter(Mandatory)]
    [string]$ExpectedVersion,

    [Parameter(Mandatory)]
    [string]$ExpectedCommit
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$archivePath = (Resolve-Path -LiteralPath $Archive).Path
$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$workDir = Join-Path $tempRoot ("nomadbank-release-smoke-{0}" -f [Guid]::NewGuid().ToString('N'))
$process = $null
$processStarted = $false
$runningOnWindows = [Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [Runtime.InteropServices.OSPlatform]::Windows
)

try {
    New-Item -ItemType Directory -Path $workDir | Out-Null

    if ($archivePath.EndsWith('.zip', [StringComparison]::OrdinalIgnoreCase)) {
        Expand-Archive -LiteralPath $archivePath -DestinationPath $workDir
    } elseif ($archivePath.EndsWith('.tar.gz', [StringComparison]::OrdinalIgnoreCase)) {
        & tar -xzf $archivePath -C $workDir
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to extract $archivePath"
        }
    } else {
        throw "Unsupported release archive: $archivePath"
    }

    $binaryName = if ($runningOnWindows) { 'nomadbank.exe' } else { 'nomadbank' }
    $binaryPath = Join-Path $workDir $binaryName
    if (-not (Test-Path -LiteralPath $binaryPath -PathType Leaf)) {
        throw "Release archive does not contain $binaryName"
    }
    if (-not $runningOnWindows) {
        & chmod +x $binaryPath
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to make $binaryName executable"
        }
    }

    $versionOutput = (& $binaryPath -version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to run $binaryName -version"
    }
    if ($versionOutput.IndexOf($ExpectedVersion, [StringComparison]::Ordinal) -lt 0) {
        throw "Version output does not contain ${ExpectedVersion}: $versionOutput"
    }
    if ($versionOutput.IndexOf($ExpectedCommit, [StringComparison]::Ordinal) -lt 0) {
        throw "Version output does not contain commit ${ExpectedCommit}: $versionOutput"
    }

    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()

    $dataDir = Join-Path $workDir 'data'
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $binaryPath
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $previousPort = $env:PORT
    $previousDataDir = $env:DATA_DIR
    try {
        $env:PORT = [string]$port
        $env:DATA_DIR = $dataDir
        if (-not $process.Start()) {
            throw "Failed to start $binaryName"
        }
        $processStarted = $true
    } finally {
        $env:PORT = $previousPort
        $env:DATA_DIR = $previousDataDir
    }

    $ready = $false
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        $process.Refresh()
        if ($process.HasExited) {
            throw "$binaryName exited before becoming ready with code $($process.ExitCode)"
        }

        try {
            $readyResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health/ready" -UseBasicParsing
            $homeResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing
            if ($readyResponse.StatusCode -eq 200 -and $homeResponse.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            if ($attempt -eq 30) {
                throw
            }
        }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        throw "$binaryName did not become ready within 30 seconds"
    }

    Write-Host "Release archive verified: $versionOutput"
} finally {
    if ($null -ne $process -and $processStarted) {
        $process.Refresh()
        if (-not $process.HasExited) {
            $process.Kill()
            $process.WaitForExit()
        }
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        if ($stdout) {
            Write-Host $stdout.TrimEnd()
        }
        if ($stderr) {
            Write-Host $stderr.TrimEnd()
        }
    }
    if ($null -ne $process) {
        $process.Dispose()
    }

    if (Test-Path -LiteralPath $workDir) {
        Remove-Item -LiteralPath $workDir -Recurse -Force
    }
}
