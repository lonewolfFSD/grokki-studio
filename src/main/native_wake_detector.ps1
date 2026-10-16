param(
    [string]$Phrases = "Hey Grokki,Hey Groki,Hey Grok"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$code = @"
using System;
using System.Globalization;
using System.Speech.Recognition;

public class NativeWakeWordDetector
{
    private SpeechRecognitionEngine sre;
    private volatile bool isPaused = false;

    public void Start(string phrases)
    {
        try
        {
            sre = new SpeechRecognitionEngine(new CultureInfo("en-US"));
            string[] list = phrases.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < list.Length; i++) {
                list[i] = list[i].Trim();
            }

            Choices choices = new Choices(list);
            GrammarBuilder gb = new GrammarBuilder(choices);
            Grammar g = new Grammar(gb);
            sre.LoadGrammar(g);

            sre.SpeechRecognized += (s, e) =>
            {
                if (e.Result != null)
                {
                    if (!isPaused && e.Result.Confidence >= 0.38f)
                    {
                        Console.WriteLine("WAKE:" + e.Result.Text + ":" + e.Result.Confidence);
                    }
                    else
                    {
                        Console.WriteLine("IGNORED:" + e.Result.Text + ":" + e.Result.Confidence + ":paused=" + isPaused);
                    }
                }
            };

            sre.SetInputToDefaultAudioDevice();
            sre.RecognizeAsync(RecognizeMode.Multiple);
            Console.WriteLine("READY");
        }
        catch (Exception ex)
        {
            Console.WriteLine("ERROR:" + ex.Message);
        }
    }

    public void Pause()
    {
        isPaused = true;
        try {
            if (sre != null) sre.RecognizeAsyncCancel();
        } catch {}
        Console.WriteLine("PAUSED");
    }

    public void Resume()
    {
        isPaused = false;
        try {
            if (sre != null) sre.RecognizeAsync(RecognizeMode.Multiple);
        } catch {}
        Console.WriteLine("RESUMED");
    }

    public void Stop()
    {
        try
        {
            if (sre != null)
            {
                sre.RecognizeAsyncStop();
                sre.Dispose();
                sre = null;
            }
        }
        catch {}
    }
}
"@

try {
    Add-Type -TypeDefinition $code -ReferencedAssemblies System.Speech
    $detector = New-Object NativeWakeWordDetector
    $detector.Start($Phrases)

    $stdin = [Console]::In
    while ($true) {
        $line = $stdin.ReadLine()
        if ($line -eq $null -or $line -eq "QUIT") {
            break
        } elseif ($line -eq "PAUSE") {
            $detector.Pause()
        } elseif ($line -eq "RESUME") {
            $detector.Resume()
        }
    }
    $detector.Stop()
} catch {
    Write-Output "FATAL:$($_.Exception.Message)"
}
