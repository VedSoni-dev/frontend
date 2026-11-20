# backlit link for Windows
# Tells the backlit tab in your browser what's playing (Spotify, Apple Music, or any app that shows up in
# Windows' media controls), so the lyrics and the light keep up.
# It answers only on this computer (localhost:47817), only with the song name, artist, album, length and position.
# Nothing is installed and nothing leaves your PC. Close this window (or press Ctrl+C) to stop it.
# Run it in Windows PowerShell (the blue one that comes with Windows).
# Source: https://github.com/VedSoni-dev/backlit/blob/main/public/link/windows.ps1  ·  MIT licence

$ErrorActionPreference = 'Stop'
$port = 47817

if ($PSVersionTable.PSEdition -eq 'Core') {
  Write-Host ""
  Write-Host "  This needs Windows PowerShell (5.1), not PowerShell 7." -ForegroundColor Yellow
  Write-Host "  Press Start, type 'Windows PowerShell', open it and paste the command again." -ForegroundColor Yellow
  return
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await($op, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $null = $task.Wait(-1)
  $task.Result
}

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$manager = Await ($mgrType::RequestAsync()) $mgrType

function Now-Playing {
  $at = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $sessions = @($manager.GetSessions())
  if ($sessions.Count -eq 0) { return @{ ok = $true; player = $null; at = $at } }
  # prefer a session that is playing, then the one Windows calls current
  $current = $manager.GetCurrentSession()
  $pick = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq 'Playing' } | Select-Object -First 1
  if (-not $pick) { $pick = $current }
  if (-not $pick) { return @{ ok = $true; player = $null; at = $at } }
  $props = Await ($pick.TryGetMediaPropertiesAsync()) $propsType
  $timeline = $pick.GetTimelineProperties()
  $playing = ($pick.GetPlaybackInfo().PlaybackStatus -eq 'Playing')
  $position = $timeline.Position.TotalSeconds
  if ($playing) {
    # Windows updates the position now and then; add the time since that update
    $since = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
    if ($since -gt 0 -and $since -lt 30) { $position += $since }
  }
  return @{
    ok = $true; player = $pick.SourceAppUserModelId; title = $props.Title; artist = $props.Artist; album = $props.AlbumTitle
    duration = $timeline.EndTime.TotalSeconds; position = $position; playing = $playing; at = $at
  }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch {
  Write-Host "  backlit link is already running (port $port), or something else uses it. Keep that window open and go back to your browser."
  return
}

Write-Host ""
Write-Host "  backlit link is on. Go back to your browser and press Connect."
Write-Host "  Close this window to stop it."
Write-Host ""

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    $res.Headers.Add('Access-Control-Allow-Origin', '*')
    $res.Headers.Add('Access-Control-Allow-Private-Network', 'true')
    $res.Headers.Add('Access-Control-Allow-Headers', '*')
    $res.Headers.Add('Cache-Control', 'no-store')
    try { $body = (Now-Playing) | ConvertTo-Json -Compress } catch { $body = '{"ok":true,"player":null}' }
    $bytes = [Text.Encoding]::UTF8.GetBytes($body)
    $res.ContentType = 'application/json; charset=utf-8'
    if ($ctx.Request.HttpMethod -eq 'OPTIONS') { $res.ContentLength64 = 0 }
    else { $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length) }
    $res.Close()
  }
} finally { $listener.Stop() }
