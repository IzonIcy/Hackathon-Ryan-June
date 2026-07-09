$ErrorActionPreference = "Stop"

$workspace = "C:\Users\vikas\OneDrive\Documents\csHackathonSub\Hackathon-Ryan-June"
$toolsDir = "$workspace\tools"

if (!(Test-Path -Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir | Out-Null
}

Write-Host "Downloading OpenJDK 17..."
$javaUrl = "https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_windows-x64_bin.zip"
$javaZip = "$toolsDir\openjdk-17.zip"
if (!(Test-Path -Path $javaZip)) {
    Invoke-WebRequest -Uri $javaUrl -OutFile $javaZip
}

Write-Host "Extracting OpenJDK 17..."
if (!(Test-Path -Path "$toolsDir\jdk-17.0.2")) {
    Expand-Archive -Path $javaZip -DestinationPath $toolsDir
}

Write-Host "Downloading Maven..."
$mvnUrl = "https://archive.apache.org/dist/maven/maven-3/3.8.8/binaries/apache-maven-3.8.8-bin.zip"
$mvnZip = "$toolsDir\maven.zip"
if (!(Test-Path -Path $mvnZip)) {
    Invoke-WebRequest -Uri $mvnUrl -OutFile $mvnZip
}

Write-Host "Extracting Maven..."
if (!(Test-Path -Path "$toolsDir\apache-maven-3.8.8")) {
    Expand-Archive -Path $mvnZip -DestinationPath $toolsDir
}

Write-Host "Done!"
