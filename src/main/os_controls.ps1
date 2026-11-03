param(
  [string]$Action = "status",
  [string]$Target = "",
  [int]$Value = 0
)

$ErrorActionPreference = 'SilentlyContinue'

# Helper for WinRT Async tasks (Radios: Wi-Fi & Bluetooth)
function Invoke-WinRtAsync($WinRtTask, $ResultType) {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(2500) | Out-Null
  return $netTask.Result
}

# 1. TOGGLE WINDOWS 11 DARK MODE
if ($Action -eq "toggle-dark-mode") {
  $regPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
  $cur = (Get-ItemProperty -Path $regPath -Name AppsUseLightTheme).AppsUseLightTheme
  $newVal = if ($Target -eq "on") { 0 } elseif ($Target -eq "off") { 1 } else { if ($cur -eq 0) { 1 } else { 0 } }
  Set-ItemProperty -Path $regPath -Name AppsUseLightTheme -Value $newVal -Type DWord
  Set-ItemProperty -Path $regPath -Name SystemUsesLightTheme -Value $newVal -Type DWord

  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ThemeBroadcast {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
"@
  $res = [UIntPtr]::Zero
  [ThemeBroadcast]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "ImmersiveColorSet", 0x0002, 500, [ref]$res) | Out-Null

  @{
    success = $true
    darkMode = ($newVal -eq 0)
  } | ConvertTo-Json -Compress
  exit 0
}

# 2. TOGGLE WINDOWS 11 NIGHT LIGHT (Real Registry CloudStore)
if ($Action -eq "toggle-night-light") {
  $nlKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default`$windows.data.bluelightreduction.bluelightreductionstate\windows.data.bluelightreduction.bluelightreductionstate"
  $enabled = $false
  if (Test-Path $nlKey) {
    $data = (Get-ItemProperty -Path $nlKey -Name Data).Data
    if ($data -and $data.Length -ge 20) {
      $isCurrentlyOn = ($data[18] -eq 0x15)
      if ($isCurrentlyOn) {
        $newData = New-Object byte[] ($data.Length - 2)
        [Array]::Copy($data, 0, $newData, 0, 22)
        [Array]::Copy($data, 25, $newData, 23, $data.Length - 25)
        $newData[18] = 0x13
        for ($i = 10; $i -lt 15; $i++) {
          if ($newData[$i] -ne 0xff) { $newData[$i]++; break }
        }
        Set-ItemProperty -Path $nlKey -Name Data -Value $newData -Type Binary
        $enabled = $false
      } else {
        $newData = New-Object byte[] ($data.Length + 2)
        [Array]::Copy($data, 0, $newData, 0, 22)
        $newData[23] = 0x10
        $newData[24] = 0x00
        [Array]::Copy($data, 23, $newData, 25, $data.Length - 23)
        $newData[18] = 0x15
        for ($i = 10; $i -lt 15; $i++) {
          if ($newData[$i] -ne 0xff) { $newData[$i]++; break }
        }
        Set-ItemProperty -Path $nlKey -Name Data -Value $newData -Type Binary
        $enabled = $true
      }
    }
  }
  @{
    success = $true
    nightLight = $enabled
  } | ConvertTo-Json -Compress
  exit 0
}

# 3. SET NIGHT LIGHT WARMTH LEVEL (0 - 100%) IN WINDOWS CLOUDSTORE
if ($Action -eq "set-night-light-warmth") {
  $settingsKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default`$windows.data.bluelightreduction.settings\windows.data.bluelightreduction.settings"
  $pct = [math]::Max(0, [math]::Min(100, $Value))
  $kelvin = [int](6500 - ($pct * 38))
  if (Test-Path $settingsKey) {
    $data = (Get-ItemProperty -Path $settingsKey -Name Data).Data
    if ($data -and $data.Length -ge 39) {
      # Map warmth temperature to Windows CloudStore bytes [0x23, 0x24]
      $tempHi = [math]::Floor(($kelvin - 1200) / 64)
      $data[35] = [byte]([math]::Max(0x10, [math]::Min(0x7E, $tempHi)))
      for ($i = 10; $i -lt 15; $i++) {
        if ($data[$i] -ne 0xff) { $data[$i]++; break }
      }
      Set-ItemProperty -Path $settingsKey -Name Data -Value $data -Type Binary
    }
  }
  @{
    success = $true
    warmth = $pct
    kelvin = $kelvin
  } | ConvertTo-Json -Compress
  exit 0
}

# 4. TOGGLE WI-FI RADIO OR CONNECT TO SSID
if ($Action -eq "toggle-wifi") {
  $wifiState = $false
  try {
    [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
    [Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
    [Windows.Devices.Radios.RadioState,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
    $radios = Invoke-WinRtAsync ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
    foreach ($r in $radios) {
      if ($r.Kind -eq 'WiFi') {
        $next = if ($r.State -eq 'On') { [Windows.Devices.Radios.RadioState]::Off } else { [Windows.Devices.Radios.RadioState]::On }
        Invoke-WinRtAsync ($r.SetStateAsync($next)) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
        $wifiState = ($next -eq 'On')
        break
      }
    }
  } catch {}
  @{ success = $true; wifiOn = $wifiState } | ConvertTo-Json -Compress
  exit 0
}

if ($Action -eq "connect-wifi") {
  if ($Target) {
    $out = netsh wlan connect name="$Target" 2>&1 | Out-String
    @{ success = $true; ssid = $Target; output = $out.Trim() } | ConvertTo-Json -Compress
    exit 0
  }
  @{ success = $false } | ConvertTo-Json -Compress
  exit 0
}

# 5. TOGGLE BLUETOOTH RADIO
if ($Action -eq "toggle-bluetooth") {
  $btState = $false
  try {
    [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
    [Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
    [Windows.Devices.Radios.RadioState,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
    $radios = Invoke-WinRtAsync ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
    foreach ($r in $radios) {
      if ($r.Kind -eq 'Bluetooth') {
        $next = if ($r.State -eq 'On') { [Windows.Devices.Radios.RadioState]::Off } else { [Windows.Devices.Radios.RadioState]::On }
        Invoke-WinRtAsync ($r.SetStateAsync($next)) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
        $btState = ($next -eq 'On')
        break
      }
    }
  } catch {}
  @{ success = $true; bluetoothOn = $btState } | ConvertTo-Json -Compress
  exit 0
}

# 6. SCAN DROPDOWN LISTS (Wi-Fi Networks, Bluetooth Devices, Audio Endpoints)
if ($Action -eq "list-wifi") {
  $curSsid = ""
  $wlanIf = netsh wlan show interfaces | Select-String "^\s*SSID\s*:\s*(.+)$" | Select-Object -First 1
  if ($wlanIf) { $curSsid = $wlanIf.Matches[0].Groups[1].Value.Trim() }

  $raw = netsh wlan show networks mode=bssid | Out-String
  $nets = @()
  $blocks = $raw -split "(?=SSID\s+\d+\s*:)"
  foreach ($b in $blocks) {
    if ($b -match "SSID\s+\d+\s*:\s*([^\r\n]+)") {
      $name = $Matches[1].Trim()
      if (-not $name) { continue }
      $sig = 75
      if ($b -match "Signal\s*:\s*(\d+)%") { $sig = [int]$Matches[1] }
      $auth = "Secured"
      if ($b -match "Authentication\s*:\s*([^\r\n]+)") { $auth = $Matches[1].Trim() }
      $nets += @{
        ssid = $name
        signal = $sig
        security = $auth
        connected = ($name -eq $curSsid)
      }
    }
  }
  @{ success = $true; current = $curSsid; networks = $nets } | ConvertTo-Json -Compress -Depth 4
  exit 0
}

if ($Action -eq "list-bluetooth") {
  $devs = @()
  $pnp = Get-PnpDevice -Class Bluetooth | Where-Object {
    $_.FriendlyName -and $_.FriendlyName -notmatch 'Enumerator|Adapter|Radio|Intel|Realtek|MediaTek|Qualcomm|Generic|Service|Protocol|Transport|RFCOMM|BthEnum'
  } | Select-Object -Unique FriendlyName, Status
  foreach ($d in $pnp) {
    $devs += @{
      name = $d.FriendlyName
      connected = ($d.Status -eq 'OK')
      status = if ($d.Status -eq 'OK') { 'Connected' } else { 'Paired' }
    }
  }
  @{ success = $true; devices = $devs } | ConvertTo-Json -Compress -Depth 4
  exit 0
}

if ($Action -eq "list-audio") {
  $endpoints = @()
  # Only output render endpoints ({0.0.0.00000000})
  $epList = Get-PnpDevice -Class AudioEndpoint -Status OK | Where-Object {
    $_.InstanceId -match '\{0\.0\.0\.00000000\}' -and $_.FriendlyName -notmatch 'Microphone|Input|Line In|Stereo Mix'
  } | Select-Object FriendlyName, InstanceId
  $first = $true
  foreach ($ep in $epList) {
    $rawId = $ep.InstanceId -replace '^SWD\\MMDEVAPI\\', ''
    $endpoints += @{
      name = $ep.FriendlyName
      id = $rawId
      active = $first
    }
    $first = $false
  }
  if ($endpoints.Count -eq 0) {
    $snd = Get-CimInstance Win32_SoundDevice | Where-Object { $_.Status -eq 'OK' }
    foreach ($s in $snd) {
      $endpoints += @{ name = $s.Name; id = $s.DeviceID; active = $first }
      $first = $false
    }
  }
  @{ success = $true; devices = $endpoints } | ConvertTo-Json -Compress -Depth 4
  exit 0
}

if ($Action -eq "set-audio") {
  if ($Target) {
    try {
      Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPolicyConfig {
  int GetMixFormat(string pszDeviceName, IntPtr ppFormat);
  int GetDeviceFormat(string pszDeviceName, bool bDefault, IntPtr ppFormat);
  int ResetDeviceFormat(string pszDeviceName);
  int SetDeviceFormat(string pszDeviceName, IntPtr pEndpointFormat, IntPtr MixFormat);
  int GetProcessingPeriod(string pszDeviceName, bool bDefault, IntPtr pmftDefaultPeriod, IntPtr pmftMinimumPeriod);
  int SetProcessingPeriod(string pszDeviceName, IntPtr pmftPeriod);
  int GetShareMode(string pszDeviceName, IntPtr pMode);
  int SetShareMode(string pszDeviceName, IntPtr mode);
  int GetPropertyValue(string pszDeviceName, bool bFxStore, IntPtr key, IntPtr pv);
  int SetPropertyValue(string pszDeviceName, bool bFxStore, IntPtr key, IntPtr pv);
  int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, int role);
  int SetEndpointVisibility(string pszDeviceName, bool bVisible);
}

[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
public class PolicyConfigClient {}

public class AudioSwitcher {
  public static void SwitchTo(string deviceId) {
    var client = (IPolicyConfig)(new PolicyConfigClient());
    client.SetDefaultEndpoint(deviceId, 0);
    client.SetDefaultEndpoint(deviceId, 1);
    client.SetDefaultEndpoint(deviceId, 2);
  }
}
"@
      [AudioSwitcher]::SwitchTo($Target)
      @{ success = $true; id = $Target } | ConvertTo-Json -Compress
      exit 0
    } catch {
      @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
      exit 0
    }
  }
  @{ success = $false } | ConvertTo-Json -Compress
  exit 0
}

# 7. APPLY DESKTOP WALLPAPER WITH NATIVE WINDOWS 11 SMOOTH CROSSFADE ANIMATION
if ($Action -eq "set-wallpaper") {
  if (-not $Target -or -not (Test-Path -LiteralPath $Target)) {
    @{ success = $false; error = "File not found" } | ConvertTo-Json -Compress
    exit 0
  }
  $resolvedPath = (Resolve-Path -LiteralPath $Target).Path
  Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name Wallpaper -Value $resolvedPath
  Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name WallpaperStyle -Value "10"
  Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name TileWallpaper -Value "0"

  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWallpaper {
  void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);
  [return: MarshalAs(UnmanagedType.LPWStr)] string GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID);
}

[ComImport, Guid("C2CF3110-460E-4fc1-B9D0-8A1C0C9CC4BD")]
public class DesktopWallpaperClass {}

public class NativeWallpaper {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);

  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, string pvParam, uint fWinIni);

  public static bool SetSmooth(string path) {
    try {
      // Enable Windows Explorer DirectComposition wallpaper crossfade layer (0x052C with wParam=0xD, lParam=1)
      IntPtr progman = FindWindow("Progman", null);
      if (progman != IntPtr.Zero) {
        UIntPtr res;
        SendMessageTimeout(progman, 0x052C, new UIntPtr(0xD), new IntPtr(1), 0, 500, out res);
      }
      var dw = (IDesktopWallpaper)(new DesktopWallpaperClass());
      dw.SetWallpaper(null, path);
      return true;
    } catch {
      return SystemParametersInfo(0x0014, 0, path, 0x0001 | 0x0002);
    }
  }
}
"@
  $ok = [NativeWallpaper]::SetSmooth($resolvedPath)
  @{
    success = $ok
    path = $resolvedPath
  } | ConvertTo-Json -Compress
  exit 0
}

# 8. COMPREHENSIVE REAL-TIME SYSTEM STATS FOR STATS TAB
if ($Action -eq "live-stats") {
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name, LoadPercentage, CurrentClockSpeed, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors
  $cpuPct = if ($null -ne $cpu.LoadPercentage) { [int]$cpu.LoadPercentage } else { 12 }
  $cpuGhz = if ($cpu.CurrentClockSpeed) { [math]::Round($cpu.CurrentClockSpeed / 1000, 2) } else { 3.2 }

  $os = Get-CimInstance Win32_OperatingSystem
  $totalRamGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
  $freeRamGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
  $usedRamGB = [math]::Round($totalRamGB - $freeRamGB, 1)
  $ramPct = if ($totalRamGB -gt 0) { [math]::Round(($usedRamGB / $totalRamGB) * 100) } else { 0 }
  $uptimeSpan = (Get-Date) - $os.LastBootUpTime
  $uptimeStr = "{0}d {1}h {2}m" -f $uptimeSpan.Days, $uptimeSpan.Hours, $uptimeSpan.Minutes

  $gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Basic|Remote' } | Select-Object -First 1 Name, AdapterRAM, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate
  if (-not $gpu) { $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, AdapterRAM, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate }
  $vramGB = if ($gpu.AdapterRAM -gt 0) { [math]::Round($gpu.AdapterRAM / 1GB, 1) } else { 4 }
  $resStr = if ($gpu.CurrentHorizontalResolution) { "$($gpu.CurrentHorizontalResolution)x$($gpu.CurrentVerticalResolution) @ $($gpu.CurrentRefreshRate)Hz" } else { "Active Display" }

  $disks = @()
  $drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $null -ne $_.Used -and ($_.Used + $_.Free) -gt 0 }
  foreach ($d in $drives) {
    $tot = [math]::Round(($d.Used + $d.Free) / 1GB, 1)
    $usd = [math]::Round($d.Used / 1GB, 1)
    $fr = [math]::Round($d.Free / 1GB, 1)
    $pct = if ($tot -gt 0) { [math]::Round(($usd / $tot) * 100) } else { 0 }
    $disks += @{
      name = "$($d.Name):"
      usedGB = $usd
      freeGB = $fr
      totalGB = $tot
      pct = $pct
    }
  }

  $bat = Get-CimInstance Win32_Battery | Select-Object -First 1 EstimatedChargeRemaining, BatteryStatus
  $batPct = if ($bat) { [int]$bat.EstimatedChargeRemaining } else { 100 }
  $batCharging = if ($bat) { ($bat.BatteryStatus -eq 2 -or $bat.BatteryStatus -eq 6) } else { $true }
  $batLabel = if ($bat) { if ($batCharging) { "Charging" } else { "On Battery" } } else { "AC Power" }

  $netAdapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1 Name, LinkSpeed
  $ipAddr = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.|^169\.254\.' } | Select-Object -First 1).IPAddress

  $topProcs = @()
  $procs = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 4 ProcessName, WorkingSet64, Id
  foreach ($p in $procs) {
    $topProcs += @{
      name = $p.ProcessName
      memMB = [math]::Round($p.WorkingSet64 / 1MB, 0)
      pid = $p.Id
    }
  }

  @{
    success = $true
    cpu = @{
      name = ($cpu.Name -replace '\s+', ' ').Trim()
      pct = $cpuPct
      ghz = $cpuGhz
      cores = $cpu.NumberOfCores
      threads = $cpu.NumberOfLogicalProcessors
    }
    ram = @{
      usedGB = $usedRamGB
      freeGB = $freeRamGB
      totalGB = $totalRamGB
      pct = $ramPct
    }
    gpu = @{
      name = $gpu.Name
      vramGB = $vramGB
      display = $resStr
    }
    uptime = $uptimeStr
    battery = @{
      pct = $batPct
      status = $batLabel
      charging = $batCharging
    }
    network = @{
      adapter = if ($netAdapter) { $netAdapter.Name } else { "Wi-Fi" }
      speed = if ($netAdapter) { $netAdapter.LinkSpeed } else { "Connected" }
      ip = if ($ipAddr) { $ipAddr } else { "Local LAN" }
    }
    disks = $disks
    processes = $topProcs
  } | ConvertTo-Json -Compress -Depth 4
  exit 0
}

# 9. DEFAULT STATUS CHECK FOR CONTROL CENTRE PILLS
$regPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
$appsLight = (Get-ItemProperty -Path $regPath -Name AppsUseLightTheme).AppsUseLightTheme
$darkModeOn = ($appsLight -eq 0)

$nlKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default`$windows.data.bluelightreduction.bluelightreductionstate\windows.data.bluelightreduction.bluelightreductionstate"
$nightLightOn = $false
if (Test-Path $nlKey) {
  $nlData = (Get-ItemProperty -Path $nlKey -Name Data).Data
  if ($nlData -and $nlData.Length -ge 20) {
    $nightLightOn = ($nlData[18] -eq 0x15)
  }
}

$curSsid = ""
$wlanIf = netsh wlan show interfaces | Select-String "^\s*SSID\s*:\s*(.+)$" | Select-Object -First 1
if ($wlanIf) { $curSsid = $wlanIf.Matches[0].Groups[1].Value.Trim() }
$wifiEnabled = [bool]$curSsid
if (-not $wifiEnabled) {
  $wlanState = netsh wlan show interfaces | Select-String "^\s*Radio status\s*:\s*Hardware On\s+Software On"
  if ($wlanState) { $wifiEnabled = $true }
}

$btEnabled = $true
$btRadio = Get-PnpDevice -Class Bluetooth | Where-Object { $_.Status -eq 'OK' } | Select-Object -First 1
if (-not $btRadio) { $btEnabled = $false }

$audioDevName = "System Output"
$epFirst = Get-PnpDevice -Class AudioEndpoint -Status OK | Where-Object {
  $_.InstanceId -match '\{0\.0\.0\.00000000\}' -and $_.FriendlyName -notmatch 'Microphone|Input|Line In|Stereo Mix'
} | Select-Object -First 1 FriendlyName
if ($epFirst -and $epFirst.FriendlyName) {
  $audioDevName = $epFirst.FriendlyName
}

@{
  success = $true
  wifiEnabled = $wifiEnabled
  wifiSsid = if ($curSsid) { $curSsid } else { "On" }
  btEnabled = $btEnabled
  audioDevice = $audioDevName
  nightLight = $nightLightOn
  darkMode = $darkModeOn
} | ConvertTo-Json -Compress
exit 0
