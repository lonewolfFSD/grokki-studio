// JScript running via Windows Script Host (cscript.exe //nologo)
// Queries Shell.Application COM object to retrieve currently selected items in Windows File Explorer and Desktop.

try {
    var shell = new ActiveXObject("Shell.Application");
    var wins = shell.Windows();
    var paths = [];

    // 1. Iterate open File Explorer windows
    var count = wins.Count;
    for (var i = 0; i < count; i++) {
        try {
            var w = wins.Item(i);
            if (w && w.Document) {
                var sel = w.Document.SelectedItems();
                if (sel && sel.Count > 0) {
                    for (var j = 0; j < sel.Count; j++) {
                        var p = sel.Item(j).Path;
                        if (p) paths.push(p);
                    }
                }
            }
        } catch (we) {}
    }

    // 2. Query Windows Desktop (SWC_DESKTOP = 8, SWFO_NEEDDISPATCH = 1)
    try {
        var desktop = wins.FindWindowSW(0, 0, 8, 0, 1);
        if (desktop && desktop.Document) {
            var dsel = desktop.Document.SelectedItems();
            if (dsel && dsel.Count > 0) {
                for (var k = 0; k < dsel.Count; k++) {
                    var dp = dsel.Item(k).Path;
                    if (dp) paths.push(dp);
                }
            }
        }
    } catch (de) {}

    // Output paths separated by triple pipes
    if (paths.length > 0) {
        WScript.Echo(paths.join("|||"));
    }
} catch (err) {}
