param (
    [string]$action = "click",
    [int]$x = 0,
    [int]$y = 0,
    [int]$fromX = 0,
    [int]$fromY = 0,
    [int]$toX = 0,
    [int]$toY = 0,
    [int]$durationMs = 260,
    [int]$amount = 120,
    [string]$text = "",
    [string]$keys = "",
    [string]$app = "",
    [int]$volume = 50
)

$cSharpCode = @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Text;

public class OSInputEngine {
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public const byte VK_MEDIA_NEXT_TRACK = 0xB0;
    public const byte VK_MEDIA_PREV_TRACK = 0xB1;
    public const byte VK_MEDIA_STOP = 0xB2;
    public const byte VK_MEDIA_PLAY_PAUSE = 0xB3;

    public const int KEYEVENTF_KEYUP = 0x02;

    public static void SendMediaKey(string mediaKey) {
        byte vk = VK_MEDIA_PLAY_PAUSE;
        string k = (mediaKey ?? "").ToLower().Trim();
        if (k == "next" || k == "skip") vk = VK_MEDIA_NEXT_TRACK;
        else if (k == "prev" || k == "previous" || k == "back") vk = VK_MEDIA_PREV_TRACK;
        else if (k == "stop" || k == "close") vk = VK_MEDIA_STOP;
        else vk = VK_MEDIA_PLAY_PAUSE;

        keybd_event(vk, 0, 0, UIntPtr.Zero);
        Thread.Sleep(35);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
    public const int MOUSEEVENTF_LEFTUP = 0x04;
    public const int MOUSEEVENTF_RIGHTDOWN = 0x08;
    public const int MOUSEEVENTF_RIGHTUP = 0x10;
    public const int MOUSEEVENTF_WHEEL = 0x0800;

    public static void MoveSmooth(int targetX, int targetY, int durationMs = 260) {
        POINT start;
        GetCursorPos(out start);
        int steps = Math.Max(18, durationMs / 12);
        for (int i = 1; i <= steps; i++) {
            float t = (float)i / steps;
            float ease = 1f - (float)Math.Pow(1f - t, 3);
            int curX = (int)(start.X + (targetX - start.X) * ease);
            int curY = (int)(start.Y + (targetY - start.Y) * ease);
            SetCursorPos(curX, curY);
            Thread.Sleep(Math.Max(4, durationMs / steps));
        }
        SetCursorPos(targetX, targetY);
    }

    public static void Click(int x, int y, int durationMs = 260) {
        MoveSmooth(x, y, durationMs);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(45);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void DoubleClick(int x, int y, int durationMs = 260) {
        Click(x, y, durationMs);
        Thread.Sleep(75);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(45);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void RightClick(int x, int y, int durationMs = 260) {
        MoveSmooth(x, y, durationMs);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
        Thread.Sleep(45);
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
    }

    public static void Drag(int fromX, int fromY, int toX, int toY, int durationMs = 380) {
        MoveSmooth(fromX, fromY, 180);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(40);
        MoveSmooth(toX, toY, durationMs);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void Scroll(int amount) {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, amount, 0);
    }

    public static bool FocusProcess(string procName) {
        Process[] procs = Process.GetProcessesByName(procName);
        foreach (var p in procs) {
            if (p.MainWindowHandle != IntPtr.Zero) {
                ShowWindow(p.MainWindowHandle, 9); // SW_RESTORE
                SetForegroundWindow(p.MainWindowHandle);
                return true;
            }
        }
        return false;
    }

    public static string GetActiveTitle() {
        IntPtr hwnd = GetForegroundWindow();
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hwnd, sb, 256);
        return sb.ToString();
    }

    public static string GetProcessBounds(string procName) {
        Process[] procs = Process.GetProcessesByName(procName);
        foreach (var p in procs) {
            if (p.MainWindowHandle != IntPtr.Zero) {
                RECT r;
                GetWindowRect(p.MainWindowHandle, out r);
                return string.Format("{0},{1},{2},{3}", r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top);
            }
        }
        return "0,0,0,0";
    }

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool LockWorkStation();

    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    public const uint WM_CLOSE = 0x0010;
    public const byte VK_LWIN = 0x5B;
    public const byte VK_MENU = 0x12; // Alt

    public static void SendWinKey(byte vk) {
        keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
        Thread.Sleep(25);
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        Thread.Sleep(25);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(25);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendWinAltKey(byte vk) {
        keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
        keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        Thread.Sleep(30);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void SendVirtualKey(byte vk) {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        Thread.Sleep(25);
        keybd_event(vk, 0, 2, UIntPtr.Zero); // 2 = KEYEVENTF_KEYUP
    }

    public static void AltTab() {
        keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
        Thread.Sleep(20);
        keybd_event(0x09, 0, 0, UIntPtr.Zero); // Tab
        Thread.Sleep(20);
        keybd_event(0x09, 0, 2, UIntPtr.Zero);
        Thread.Sleep(20);
        keybd_event(VK_MENU, 0, 2, UIntPtr.Zero);
    }

    public static string CloseActiveWindow() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "NO_ACTIVE_WINDOW";
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hwnd, sb, 256);
        string title = sb.ToString();
        PostMessage(hwnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
        return string.IsNullOrEmpty(title) ? "Closed active window" : "Closed " + title;
    }

    public static string ManageActiveWindow(string mode, int x, int y, int w, int h) {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "NO_ACTIVE_WINDOW";
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hwnd, sb, 256);
        string title = sb.ToString();
        if (string.IsNullOrEmpty(title)) title = "Active Window";

        if (mode == "minimize") {
            ShowWindow(hwnd, 6); // SW_MINIMIZE
            return "Minimized " + title;
        } else if (mode == "maximize") {
            ShowWindow(hwnd, 3); // SW_MAXIMIZE
            return "Maximized " + title;
        } else if (mode == "restore") {
            ShowWindow(hwnd, 9); // SW_RESTORE
            return "Restored " + title;
        } else if (mode == "snap") {
            ShowWindow(hwnd, 9); // Restore first so maximized window can be resized
            Thread.Sleep(60);
            MoveWindow(hwnd, x, y, w, h, true);
            return "Snapped " + title;
        }
        return "Done";
    }
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out uint pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, System.Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, System.Guid pguidEventContext);
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, System.Guid pguidEventContext);
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
    int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
    int VolumeStepUp(System.Guid pguidEventContext);
    int VolumeStepDown(System.Guid pguidEventContext);
    int QueryHardwareSupport(out uint pdwHardwareSupportMask);
    int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int f();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class AudioMasterEngine {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public const byte VK_VOLUME_MUTE = 0xAD;
    public const byte VK_VOLUME_DOWN = 0xAE;
    public const byte VK_VOLUME_UP = 0xAF;
    public const uint KEYEVENTF_KEYUP = 0x0002;

    private static void PulseKey(byte vk) {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(20);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    private static IAudioEndpointVolume GetVolumeObject() {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume epv = null;
        dev.Activate(ref IID_IAudioEndpointVolume, 23, 0, out epv);
        return epv;
    }

    public static int GetVolume() {
        try {
            var epv = GetVolumeObject();
            float vol = 0;
            epv.GetMasterVolumeLevelScalar(out vol);
            return (int)Math.Round(vol * 100);
        } catch { return -1; }
    }

    public static bool GetMute() {
        try {
            var epv = GetVolumeObject();
            bool mute;
            epv.GetMute(out mute);
            return mute;
        } catch { return false; }
    }

    public static void SetVolume(int percent) {
        try {
            var epv = GetVolumeObject();
            float scalar = Math.Max(0f, Math.Min(100f, (float)percent)) / 100f;
            epv.SetMasterVolumeLevelScalar(scalar, System.Guid.Empty);
            if (percent > 0) {
                bool isMuted;
                epv.GetMute(out isMuted);
                if (isMuted) {
                    epv.SetMute(false, System.Guid.Empty);
                }
            }
            PulseKey(VK_VOLUME_UP);
            PulseKey(VK_VOLUME_DOWN);
        } catch {}
    }

    public static bool SetMute(bool mute) {
        try {
            var epv = GetVolumeObject();
            epv.SetMute(mute, System.Guid.Empty);
            PulseKey(VK_VOLUME_MUTE);
            return mute;
        } catch { return false; }
    }

    public static bool ToggleMute() {
        try {
            var epv = GetVolumeObject();
            bool mute;
            epv.GetMute(out mute);
            bool target = !mute;
            epv.SetMute(target, System.Guid.Empty);
            PulseKey(VK_VOLUME_MUTE);
            return target;
        } catch { return false; }
    }

    public static int VolumeStep(bool up) {
        try {
            var epv = GetVolumeObject();
            bool isMuted;
            epv.GetMute(out isMuted);
            if (isMuted && up) {
                epv.SetMute(false, System.Guid.Empty);
            }
            if (up) {
                epv.VolumeStepUp(System.Guid.Empty);
                PulseKey(VK_VOLUME_UP);
            } else {
                epv.VolumeStepDown(System.Guid.Empty);
                PulseKey(VK_VOLUME_DOWN);
            }
            float vol = 0;
            epv.GetMasterVolumeLevelScalar(out vol);
            return (int)Math.Round(vol * 100);
        } catch { return -1; }
    }
}
"@

Add-Type -TypeDefinition $cSharpCode -ErrorAction SilentlyContinue

function Convert-HotkeyToKeys([string]$hotkeyStr) {
    $k = $hotkeyStr.ToLower().Trim()
    $hasCtrl = $k.Contains('ctrl')
    $hasAlt = $k.Contains('alt')
    $hasShift = $k.Contains('shift')

    $parts = $k -split '\+'
    $base = $parts[-1].Trim()

    $special = @{
        'enter' = '{ENTER}'; 'return' = '{ENTER}'; 'tab' = '{TAB}'; 'esc' = '{ESC}'; 'escape' = '{ESC}';
        'backspace' = '{BACKSPACE}'; 'delete' = '{DELETE}'; 'up' = '{UP}'; 'down' = '{DOWN}';
        'left' = '{LEFT}'; 'right' = '{RIGHT}'; 'home' = '{HOME}'; 'end' = '{END}';
        'f1' = '{F1}'; 'f2' = '{F2}'; 'f3' = '{F3}'; 'f4' = '{F4}'; 'f5' = '{F5}';
        'f6' = '{F6}'; 'f7' = '{F7}'; 'f8' = '{F8}'; 'f9' = '{F9}'; 'f10' = '{F10}';
        'f11' = '{F11}'; 'f12' = '{F12}'; 'space' = ' '
    }

    if ($special.ContainsKey($base)) {
        $char = $special[$base]
    } else {
        $char = $base
    }

    $prefix = ''
    if ($hasCtrl) { $prefix += '^' }
    if ($hasAlt) { $prefix += '%' }
    if ($hasShift) { $prefix += '+' }

    return "$prefix$char"
}

# ACTION DISPATCH
switch ($action.ToLower()) {
    "move" {
        [OSInputEngine]::MoveSmooth($x, $y, $durationMs)
        Write-Output "MOVED:$x,$y"
    }
    "click" {
        [OSInputEngine]::Click($x, $y, $durationMs)
        Write-Output "CLICKED:$x,$y"
    }
    "doubleclick" {
        [OSInputEngine]::DoubleClick($x, $y, $durationMs)
        Write-Output "DOUBLE_CLICKED:$x,$y"
    }
    "rightclick" {
        [OSInputEngine]::RightClick($x, $y, $durationMs)
        Write-Output "RIGHT_CLICKED:$x,$y"
    }
    "drag" {
        [OSInputEngine]::Drag($fromX, $fromY, $toX, $toY, $durationMs)
        Write-Output "DRAGGED:$fromX,$fromY -> $toX,$toY"
    }
    "scroll" {
        [OSInputEngine]::Scroll($amount)
        Write-Output "SCROLLED:$amount"
    }
    "type" {
        Add-Type -AssemblyName System.Windows.Forms
        if ($text) {
            $sanitized = $text.Replace('{', '{{}').Replace('}', '{}}').Replace('^', '{^}').Replace('+', '{+}').Replace('%', '{%}').Replace('~', '{~}').Replace('(', '{(}').Replace(')', '{)}').Replace('[', '{[}').Replace(']', '{]}')
            # Type character-by-character for visible human cadence
            foreach ($ch in $sanitized.ToCharArray()) {
                [System.Windows.Forms.SendKeys]::SendWait($ch.ToString())
                Start-Sleep -Milliseconds 18
            }
            Write-Output "TYPED:$text"
        }
    }
    "type-fast" {
        Add-Type -AssemblyName System.Windows.Forms
        if ($text) {
            $sanitized = $text.Replace('{', '{{}').Replace('}', '{}}').Replace('^', '{^}').Replace('+', '{+}').Replace('%', '{%}').Replace('~', '{~}').Replace('(', '{(}').Replace(')', '{)}').Replace('[', '{[}').Replace(']', '{]}')
            [System.Windows.Forms.SendKeys]::SendWait($sanitized)
            Write-Output "TYPED_FAST"
        }
    }
    "hotkey" {
        Add-Type -AssemblyName System.Windows.Forms
        if ($keys) {
            $sendKeyFormat = Convert-HotkeyToKeys $keys
            [System.Windows.Forms.SendKeys]::SendWait($sendKeyFormat)
            Write-Output "HOTKEY:$keys"
        }
    }
    "media" {
        [OSInputEngine]::SendMediaKey($keys)
        Write-Output "MEDIA_KEY:$keys"
    }
    "focus" {
        if ($app) {
            $ok = [OSInputEngine]::FocusProcess($app)
            Write-Output "FOCUSED:$app=$ok"
        }
    }
    "get-pos" {
        $pt = New-Object OSInputEngine+POINT
        [OSInputEngine]::GetCursorPos([ref]$pt) | Out-Null
        Write-Output "$($pt.X),$($pt.Y)"
    }
    "get-active" {
        $title = [OSInputEngine]::GetActiveTitle()
        Write-Output $title
    }
    "get-bounds" {
        if ($app) {
            $bounds = [OSInputEngine]::GetProcessBounds($app)
            Write-Output $bounds
        }
    }
    "volume-get" {
        $v = [AudioMasterEngine]::GetVolume()
        $m = [AudioMasterEngine]::GetMute()
        Write-Output "$v"
    }
    "volume-set" {
        [AudioMasterEngine]::SetVolume($volume)
        $newV = [AudioMasterEngine]::GetVolume()
        Write-Output $newV
    }
    "volume-up" {
        $next = [AudioMasterEngine]::VolumeStep($true)
        Write-Output $next
    }
    "volume-down" {
        $next = [AudioMasterEngine]::VolumeStep($false)
        Write-Output $next
    }
    "volume-mute" {
        $muted = [AudioMasterEngine]::SetMute($true)
        Write-Output "MUTED:$muted"
    }
    "volume-unmute" {
        $muted = [AudioMasterEngine]::SetMute($false)
        Write-Output "MUTED:$muted"
    }
    "volume-toggle" {
        $muted = [AudioMasterEngine]::ToggleMute()
        Write-Output "MUTED:$muted"
    }
    "close-active" {
        Add-Type -AssemblyName System.Windows.Forms
        $activeTitle = [OSInputEngine]::GetActiveTitle()
        if ($activeTitle -match "Grokki" -or [string]::IsNullOrWhiteSpace($activeTitle)) {
            [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")
            Start-Sleep -Milliseconds 220
        }
        $res = [OSInputEngine]::CloseActiveWindow()
        Write-Output $res
    }
    "close-app" {
        if ($app) {
            $procs = Get-Process -Name $app -ErrorAction SilentlyContinue
            if ($procs) {
                $procs | ForEach-Object { $_.CloseMainWindow() | Out-Null }
                Start-Sleep -Milliseconds 250
                $remaining = Get-Process -Name $app -ErrorAction SilentlyContinue
                if ($remaining) {
                    $remaining | Stop-Process -Force -ErrorAction SilentlyContinue
                }
                Write-Output "Closed $app"
            } else {
                Write-Output "App $app not found"
            }
        } else {
            $res = [OSInputEngine]::CloseActiveWindow()
            Write-Output $res
        }
    }
    "system-power" {
        $raw = if ($keys) { $keys } else { $text }
        $cmd = ("$raw").ToLower().Trim()
        switch ($cmd) {
            "lock" {
                [OSInputEngine]::LockWorkStation()
                Write-Output "LOCKED"
            }
            "sleep" {
                Add-Type -Assembly System.Windows.Forms
                [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)
                Write-Output "SLEEPING"
            }
            "shutdown" {
                shutdown.exe /s /t 10 /c "Shutdown initiated by Grokki"
                Write-Output "SHUTDOWN_SCHEDULED"
            }
            "restart" {
                shutdown.exe /r /t 10 /c "Restart initiated by Grokki"
                Write-Output "RESTART_SCHEDULED"
            }
            "cancel" {
                shutdown.exe /a
                Write-Output "CANCELLED"
            }
            default {
                Write-Output "UNKNOWN_POWER_COMMAND:$cmd"
            }
        }
    }
    "brightness-get" {
        try {
            $b = (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop).CurrentBrightness
            Write-Output "$b"
        } catch {
            Write-Output "100"
        }
    }
    "brightness-set" {
        try {
            $lvl = [math]::Max(0, [math]::Min(100, [int]$volume))
            Invoke-CimMethod -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = [byte]$lvl } -ErrorAction Stop | Out-Null
            Write-Output "$lvl"
        } catch {
            Write-Output "ERR_BRIGHTNESS"
        }
    }
    "brightness-up" {
        try {
            $cur = (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop).CurrentBrightness
            $lvl = [math]::Min(100, [int]$cur + 15)
            Invoke-CimMethod -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = [byte]$lvl } -ErrorAction Stop | Out-Null
            Write-Output "$lvl"
        } catch {
            Write-Output "ERR_BRIGHTNESS"
        }
    }
    "brightness-down" {
        try {
            $cur = (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop).CurrentBrightness
            $lvl = [math]::Max(5, [int]$cur - 15)
            Invoke-CimMethod -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = [byte]$lvl } -ErrorAction Stop | Out-Null
            Write-Output "$lvl"
        } catch {
            Write-Output "ERR_BRIGHTNESS"
        }
    }
    "window-manage" {
        Add-Type -AssemblyName System.Windows.Forms
        $cmd = (if ($keys) { $keys } else { $text }).ToLower().Trim().Replace('_', '-')
        if ($cmd -eq "show-desktop" -or $cmd -eq "minimize-all") {
            [OSInputEngine]::SendWinKey(0x44) # Win+D
            Write-Output "Toggled Desktop (Minimized all windows)"
        } else {
            if ($app) {
                [OSInputEngine]::FocusProcess($app) | Out-Null
                Start-Sleep -Milliseconds 160
            } else {
                $activeTitle = [OSInputEngine]::GetActiveTitle()
                if ($activeTitle -match "Grokki" -or [string]::IsNullOrWhiteSpace($activeTitle)) {
                    [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")
                    Start-Sleep -Milliseconds 220
                }
            }
            $wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
            $halfW = [math]::Round($wa.Width / 2)
            if ($cmd -eq "minimize") {
                Write-Output ([OSInputEngine]::ManageActiveWindow("minimize", 0, 0, 0, 0))
            } elseif ($cmd -eq "maximize") {
                Write-Output ([OSInputEngine]::ManageActiveWindow("maximize", 0, 0, 0, 0))
            } elseif ($cmd -eq "restore") {
                Write-Output ([OSInputEngine]::ManageActiveWindow("restore", 0, 0, 0, 0))
            } elseif ($cmd -eq "snap-left") {
                Write-Output ([OSInputEngine]::ManageActiveWindow("snap", $wa.Left, $wa.Top, $halfW, $wa.Height))
            } elseif ($cmd -eq "snap-right") {
                Write-Output ([OSInputEngine]::ManageActiveWindow("snap", $wa.Left + $halfW, $wa.Top, $halfW, $wa.Height))
            } elseif ($cmd -eq "split-screen") {
                $first = [OSInputEngine]::ManageActiveWindow("snap", $wa.Left, $wa.Top, $halfW, $wa.Height)
                Start-Sleep -Milliseconds 140
                [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")
                Start-Sleep -Milliseconds 240
                $second = [OSInputEngine]::ManageActiveWindow("snap", $wa.Left + $halfW, $wa.Top, $halfW, $wa.Height)
                Write-Output "$first | $second"
            }
        }
    }
    "screenshot-save" {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        $shotsDir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Grokki_Screenshots'
        if (-not (Test-Path $shotsDir)) { New-Item -ItemType Directory -Path $shotsDir -Force | Out-Null }
        $stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
        $target = Join-Path $shotsDir "Screenshot_$stamp.png"
        $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
        try { [System.Windows.Forms.Clipboard]::SetImage($bmp) } catch {}
        $bmp.Dispose()
        $graphics.Dispose()
        Write-Output $target
    }
    "screen-record" {
        [OSInputEngine]::SendWinAltKey(0x52) # Win+Alt+R (Windows Game Bar Screen Recorder)
        Write-Output "RECORD_TOGGLED"
    }
    "mic-mute" {
        [OSInputEngine]::SendWinAltKey(0x4B) # Win+Alt+K (Windows System Mic Mute)
        Write-Output "MIC_TOGGLED"
    }
    "slide-control" {
        $rawCmd = if ($keys) { $keys } else { $text }
        $cmd = ($rawCmd + "").ToLower().Trim()
        
        # If Grokki window is currently foreground, switch to the presentation window
        $activeTitle = [OSInputEngine]::GetActiveTitle()
        if ($activeTitle -match "Grokki" -or [string]::IsNullOrWhiteSpace($activeTitle)) {
            [OSInputEngine]::AltTab()
            Start-Sleep -Milliseconds 140
        }
        
        if ($cmd -eq "next" -or $cmd -eq "forward" -or $cmd -eq "right") {
            [OSInputEngine]::SendVirtualKey(0x27) # Right Arrow
            Write-Output "SLIDE:NEXT"
        } elseif ($cmd -eq "prev" -or $cmd -eq "previous" -or $cmd -eq "back" -or $cmd -eq "left") {
            [OSInputEngine]::SendVirtualKey(0x25) # Left Arrow
            Write-Output "SLIDE:PREV"
        } elseif ($cmd -eq "blackout" -or $cmd -eq "blank" -or $cmd -eq "b") {
            [OSInputEngine]::SendVirtualKey(0x42) # 'B' key
            Write-Output "SLIDE:BLACKOUT"
        } elseif ($cmd -eq "fullscreen" -or $cmd -eq "start" -or $cmd -eq "f5") {
            [OSInputEngine]::SendVirtualKey(0x74) # F5 key
            Write-Output "SLIDE:FULLSCREEN"
        } else {
            [OSInputEngine]::SendVirtualKey(0x27) # Default Right Arrow
            Write-Output "SLIDE:NEXT"
        }
    }
    "capture" {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        $target = Join-Path $env:TEMP 'screen_capture.jpg'
        $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $bmp.Dispose()
        $graphics.Dispose()
        Write-Output $target
    }
    "grab-selection" {
        Add-Type -AssemblyName System.Windows.Forms
        $activeTitle = [OSInputEngine]::GetActiveTitle()
        if ($activeTitle -match "Grokki" -or [string]::IsNullOrWhiteSpace($activeTitle)) {
            [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")
            Start-Sleep -Milliseconds 240
        }
        [System.Windows.Forms.SendKeys]::SendWait("^c")
        Start-Sleep -Milliseconds 180
        $clip = Get-Clipboard -Raw -ErrorAction SilentlyContinue
        if ($clip) {
            Write-Output $clip
        } else {
            Write-Output ""
        }
    }
    "paste-selection" {
        Add-Type -AssemblyName System.Windows.Forms
        $activeTitle = [OSInputEngine]::GetActiveTitle()
        if ($activeTitle -match "Grokki" -or [string]::IsNullOrWhiteSpace($activeTitle)) {
            [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")
            Start-Sleep -Milliseconds 240
        }
        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Start-Sleep -Milliseconds 120
        Write-Output "PASTED"
    }
    default {
        Write-Output "UNKNOWN_ACTION:$action"
    }
}
