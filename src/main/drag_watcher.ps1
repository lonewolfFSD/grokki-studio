$ErrorActionPreference = 'SilentlyContinue'

$csharp = @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class NativeDragHelper {
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT Point);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    public static bool IsLButtonDown() {
        return (GetAsyncKeyState(0x01) & 0x8000) != 0;
    }

    public static POINT GetPos() {
        POINT pt;
        GetCursorPos(out pt);
        return pt;
    }

    public static string GetActiveProcessName() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "";
        uint pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == 0) return "";
        try {
            return Process.GetProcessById((int)pid).ProcessName.ToLower();
        } catch {
            return "";
        }
    }
}
'@

Add-Type -TypeDefinition $csharp -ErrorAction SilentlyContinue

$shell = New-Object -ComObject Shell.Application

function Get-SelectedExplorerFiles() {
    $paths = @()
    try {
        foreach ($w in $shell.Windows()) {
            $sel = $w.Document.SelectedItems()
            if ($sel -and $sel.Count -gt 0) {
                foreach ($item in $sel) {
                    if ($item.Path) { $paths += $item.Path }
                }
            }
        }
    } catch {}
    return $paths
}

Write-Output "READY"

$isDragging = $false
$downPos = $null
$lastActiveProc = ""

while ($true) {
    Start-Sleep -Milliseconds 45
    $isDown = [NativeDragHelper]::IsLButtonDown()
    $pos = [NativeDragHelper]::GetPos()

    if ($isDown) {
        if (-not $downPos) {
            $downPos = $pos
            $lastActiveProc = [NativeDragHelper]::GetActiveProcessName()
        } else {
            $dx = [Math]::Abs($pos.X - $downPos.X)
            $dy = [Math]::Abs($pos.Y - $downPos.Y)
            $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)

            if (-not $isDragging -and $dist -ge 16) {
                # Check if dragging in Explorer / Desktop or dragging towards top notch
                $isExplorer = ($lastActiveProc -eq "explorer")
                $isMovingToTop = ($pos.Y -lt 250 -and $pos.Y -lt $downPos.Y)
                
                $files = @()
                if ($isExplorer) {
                    $files = Get-SelectedExplorerFiles
                }

                if (($isExplorer -and $files.Count -gt 0) -or ($isMovingToTop -and $dist -ge 30)) {
                    $isDragging = $true
                    $fileJson = if ($files.Count -gt 0) { $files -join "|||" } else { "" }
                    [Console]::Out.WriteLine("DRAG_START $fileJson")
                }
            }
        }
    } else {
        if ($isDragging) {
            $isDragging = $false
            [Console]::Out.WriteLine("DRAG_END")
        }
        $downPos = $null
    }
}
