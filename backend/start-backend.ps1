[CmdletBinding()]
param(
  [switch]$Clean,
  [switch]$SkipTests = $true
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$javaHome = 'C:\Users\the\.jdks\ms-17.0.18'
$mavenCandidates = @(
  $env:MAVEN_CMD,
  'E:\Program Files\JetBrains\IntelliJ IDEA 2025.3.4\plugins\maven\lib\maven3\bin\mvn.cmd'
) | Where-Object { $_ }

if (-not (Test-Path $javaHome)) {
  throw "Java 17 not found at $javaHome"
}

$env:JAVA_HOME = $javaHome
if ($env:Path -notlike "$javaHome\\bin*") {
  $env:Path = "$javaHome\\bin;$env:Path"
}

$mavenCommand = $null
$mvnFromPath = Get-Command mvn -ErrorAction SilentlyContinue
if ($mvnFromPath) {
  $mavenCommand = $mvnFromPath.Source
}

if (-not $mavenCommand) {
  foreach ($candidate in $mavenCandidates) {
    if ($candidate -and (Test-Path $candidate)) {
      $mavenCommand = $candidate
      break
    }
  }
}

if (-not $mavenCommand) {
  throw 'Maven not found. Configure MAVEN_CMD or install Maven into PATH.'
}

$mavenBin = Split-Path -Parent $mavenCommand
if ($env:Path -notlike "$mavenBin*") {
  $env:Path = "$mavenBin;$env:Path"
}

$goals = @()
if ($Clean) {
  $goals += 'clean'
}
$goals += 'spring-boot:run'

$arguments = @()
if ($SkipTests) {
  $arguments += '-DskipTests'
}
$arguments += $goals

Set-Location $scriptRoot

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "Maven=$mavenCommand"
Write-Host "WorkingDir=$scriptRoot"

& $mavenCommand @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}