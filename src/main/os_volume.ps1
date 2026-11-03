param(
  [string]$Action = "get",
  [int]$Value = -1,
  [switch]$Daemon
)

$ErrorActionPreference = 'SilentlyContinue'

$csharp = @'
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
    int f(); int g(); int h(); int m();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j();
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int f();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject { }

public class AudioMaster {
    private static IAudioEndpointVolume GetEndpoint() {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev = null;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        if (dev == null) return null;
        IAudioEndpointVolume ep = null;
        var iid = typeof(IAudioEndpointVolume).GUID;
        dev.Activate(ref iid, 23, 0, out ep);
        return ep;
    }

    public static float GetVolume() {
        try {
            var ep = GetEndpoint();
            if (ep == null) return 0.5f;
            float vol = 0;
            ep.GetMasterVolumeLevelScalar(out vol);
            return vol;
        } catch {
            return 0.5f;
        }
    }

    public static bool GetMute() {
        try {
            var ep = GetEndpoint();
            if (ep == null) return false;
            bool mute = false;
            ep.GetMute(out mute);
            return mute;
        } catch {
            return false;
        }
    }

    public static void SetVolume(float vol) {
        try {
            var ep = GetEndpoint();
            if (ep == null) return;
            if (vol < 0.0f) vol = 0.0f;
            if (vol > 1.0f) vol = 1.0f;
            ep.SetMasterVolumeLevelScalar(vol, Guid.Empty);
        } catch {}
    }

    public static void SetMute(bool mute) {
        try {
            var ep = GetEndpoint();
            if (ep == null) return;
            ep.SetMute(mute, Guid.Empty);
        } catch {}
    }

    public static bool ToggleMute() {
        try {
            var ep = GetEndpoint();
            if (ep == null) return false;
            bool mute = false;
            ep.GetMute(out mute);
            ep.SetMute(!mute, Guid.Empty);
            return !mute;
        } catch {
            return false;
        }
    }
}
'@

Add-Type -TypeDefinition $csharp -ErrorAction SilentlyContinue

function Get-AudioJson() {
  $v = [math]::Round(([AudioMaster]::GetVolume() * 100))
  $m = [AudioMaster]::GetMute()
  return (@{ success = $true; volume = $v; muted = $m } | ConvertTo-Json -Compress)
}

if ($Daemon) {
  [Console]::Out.WriteLine("READY")
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    $parts = $line.Trim() -split '\s+'
    $cmd = $parts[0].ToLower()
    if ($cmd -eq "get") {
      [Console]::Out.WriteLine((Get-AudioJson))
    } elseif ($cmd -eq "set" -and $parts.Length -gt 1) {
      $val = [float]$parts[1]
      [AudioMaster]::SetVolume($val / 100.0)
      [Console]::Out.WriteLine((Get-AudioJson))
    } elseif ($cmd -eq "toggle-mute") {
      [AudioMaster]::ToggleMute() | Out-Null
      [Console]::Out.WriteLine((Get-AudioJson))
    } elseif ($cmd -eq "mute") {
      [AudioMaster]::SetMute($true)
      [Console]::Out.WriteLine((Get-AudioJson))
    } elseif ($cmd -eq "unmute") {
      [AudioMaster]::SetMute($false)
      [Console]::Out.WriteLine((Get-AudioJson))
    }
  }
  exit 0
}

# Standalone execution
if ($Action -eq "set" -and $Value -ge 0) {
  $scalar = [float]($Value / 100.0)
  [AudioMaster]::SetVolume($scalar)
} elseif ($Action -eq "mute") {
  [AudioMaster]::SetMute($true)
} elseif ($Action -eq "unmute") {
  [AudioMaster]::SetMute($false)
} elseif ($Action -eq "toggle-mute") {
  [AudioMaster]::ToggleMute() | Out-Null
}

Write-Output (Get-AudioJson)
