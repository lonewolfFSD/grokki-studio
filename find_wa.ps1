
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinFinder {
    public delegate bool EnumWindowsProc(IntPtr hWnd, int lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumFunc, int lParam);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$list = [System.Collections.Generic.List[PSObject]]::new()
[WinFinder]::EnumWindows({
    param($hwnd, $lparam)
    $pid = 0
    [WinFinder]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
    if ($pid -eq 134240) {
        $sb = [System.Text.StringBuilder]::new(256)
        [WinFinder]::GetWindowText($hwnd, $sb, 256) | Out-Null
        $cb = [System.Text.StringBuilder]::new(256)
        [WinFinder]::GetClassName($hwnd, $cb, 256) | Out-Null
        $list.Add([PSCustomObject]@{
            Handle = $hwnd
            Title = $sb.ToString()
            Class = $cb.ToString()
            Visible = [WinFinder]::IsWindowVisible($hwnd)
        })
    }
    return $true
}, 0) | Out-Null

$list | Format-Table -AutoSize
