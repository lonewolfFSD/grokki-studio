$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

Function Await($WinRtTask, $ResultType) {
  if (-not $WinRtTask) { return $null }
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(1200) | Out-Null
  return $netTask.Result
}

# 1. Fast Wi-Fi SSID (~30ms)
$ssid = ""
$wlan = netsh wlan show interfaces | Select-String "^\s*SSID\s*:\s*(.+)$" | Select-Object -First 1
if ($wlan) {
  $ssid = $wlan.Matches[0].Groups[1].Value.Trim()
}

# 2. Fast Audio Output Device (~50ms)
$audioOut = "Default Audio"
$sound = Get-CimInstance Win32_SoundDevice | Where-Object { $_.Status -eq 'OK' } | Select-Object -First 1
if ($sound -and $sound.Name) {
  $audioOut = $sound.Name
}

# 3. Windows Dark Mode & Night Light Status (~5ms)
$darkMode = $true
$regTheme = Get-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name AppsUseLightTheme
if ($null -ne $regTheme -and $null -ne $regTheme.AppsUseLightTheme) {
  $darkMode = ($regTheme.AppsUseLightTheme -eq 0)
}

$nightLight = $false
$nlKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default`$windows.data.bluelightreduction.bluelightreductionstate\windows.data.bluelightreduction.bluelightreductionstate"
if (Test-Path $nlKey) {
  $nlData = (Get-ItemProperty -Path $nlKey -Name Data).Data
  if ($nlData -and $nlData.Length -gt 18) {
    $nightLight = ($nlData[18] -eq 0x15)
  }
}

# 4. Windows GSMTC Media Session (Spotify, Chrome, Edge, YouTube, VLC, etc.)
$title = ""
$artist = ""
$status = "Paused"
$pos = 0
$dur = 0
$thumbBase64 = ""

try {
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  if ($mgr) {
    # Check current session first, fallback to first active session with a valid title
    $session = $mgr.GetCurrentSession()
    $info = $null
    if ($session) {
      $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    }
    if (-not $session -or -not $info -or -not $info.Title) {
      $allSessions = $mgr.GetSessions()
      if ($allSessions -and $allSessions.Count -gt 0) {
        foreach ($s in $allSessions) {
          $testInfo = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
          if ($testInfo -and $testInfo.Title) {
            $session = $s
            $info = $testInfo
            break
          }
        }
      }
    }
    if ($session) {
      if (-not $info) {
        $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      }
      $pb = $session.GetPlaybackInfo()
      $tl = $session.GetTimelineProperties()
      if ($info) {
        $title = $info.Title
        $artist = $info.Artist
        if ($info.Thumbnail) {
          $stream = Await ($info.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
          if ($stream -and $stream.Size -gt 0 -and $stream.Size -lt 500000) {
            $reader = [Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
            $loaded = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
            $bytes = New-Object byte[] $stream.Size
            $reader.ReadBytes($bytes)
            $thumbBase64 = "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes)
          }
        }
      }
      if ($pb) {
        $status = $pb.PlaybackStatus.ToString()
      }
      if ($tl) {
        $pos = [math]::Max(0, [math]::Round($tl.Position.TotalSeconds))
        $dur = [math]::Max(0, [math]::Round($tl.EndTime.TotalSeconds))
      }
    }
  }
} catch {}

@{
  ssid = $ssid
  bluetooth = "On"
  audioDevice = $audioOut
  darkMode = $darkMode
  nightLight = $nightLight
  title = $title
  artist = $artist
  status = $status
  position = $pos
  duration = $dur
  thumbnail = $thumbBase64
  media = @{
    title = $title
    artist = $artist
    status = $status
    position = $pos
    duration = $dur
    thumbnail = $thumbBase64
  }
} | ConvertTo-Json -Compress
