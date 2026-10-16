param (
    [string]$action,
    [string]$filePath = "",
    [string]$sheet = "Sheet1",
    [string]$cell = "",
    [string]$value = "",
    [string]$findText = "",
    [string]$replaceText = "",
    [string]$exportPdf = "",
    [string]$phone = "",
    [string]$contactName = "",
    [string]$message = ""
)

# 1. EXCEL AUTOMATION
if ($action -eq "excel-edit") {
    try {
        $excel = New-Object -ComObject Excel.Application
        $excel.Visible = $false
        $excel.DisplayAlerts = $false

        $fullPath = [System.IO.Path]::GetFullPath($filePath)
        $workbook = $excel.Workbooks.Open($fullPath)
        
        $worksheet = $workbook.Sheets.Item(1)
        if ($sheet -and $workbook.Sheets.Item($sheet)) {
            $worksheet = $workbook.Sheets.Item($sheet)
        }

        if ($cell -and $value) {
            $targetCell = $worksheet.Range($cell)
            $targetCell.Value2 = $value
        }

        # Recalculate all formulas
        $excel.Calculate()

        # Save changes
        $workbook.Save()

        # Export to PDF if requested
        if ($exportPdf) {
            $pdfFullPath = [System.IO.Path]::GetFullPath($exportPdf)
            # 0 = xlTypePDF
            $workbook.ExportAsFixedFormat(0, $pdfFullPath)
        }

        $workbook.Close()
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
        
        Write-Output "SUCCESS: Excel updated successfully $(if ($exportPdf) { "and exported to PDF: $exportPdf" })"
    } catch {
        Write-Error "Excel Automation Error: $($_.Exception.Message)"
    }
}

# 2. WORD AUTOMATION
elseif ($action -eq "word-edit") {
    try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0

        $fullPath = [System.IO.Path]::GetFullPath($filePath)
        $doc = $word.Documents.Open($fullPath)

        if ($findText -and $replaceText) {
            $range = $doc.Content
            $find = $range.Find
            $find.Text = $findText
            $find.Replacement.Text = $replaceText
            # 2 = wdReplaceAll
            $find.Execute([ref]$findText, $false, $false, $false, $false, $false, $true, 1, $false, [ref]$replaceText, 2)
        }

        $doc.Save()

        if ($exportPdf) {
            $pdfFullPath = [System.IO.Path]::GetFullPath($exportPdf)
            # 17 = wdExportFormatPDF
            $doc.ExportAsFixedFormat($pdfFullPath, 17)
        }

        $doc.Close()
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null

        Write-Output "SUCCESS: Word document updated $(if ($exportPdf) { "and exported to PDF: $exportPdf" })"
    } catch {
        Write-Error "Word Automation Error: $($_.Exception.Message)"
    }
}

# 3. WHATSAPP AUTOMATION
elseif ($action -eq "whatsapp-send") {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $cleanPhone = ($phone -replace '[^\d]', '')
        $encodedMsg = [System.Uri]::EscapeDataString($message)
        $searchTarget = if ($contactName) { $contactName } else { $phone }

        if ($cleanPhone) {
            # Direct link with numeric phone number
            $url = "https://web.whatsapp.com/send?phone=$cleanPhone&text=$encodedMsg"
            Start-Process $url
            Start-Sleep -Seconds 3
        } else {
            # Launch WhatsApp app or web
            try {
                Start-Process "whatsapp:" -ErrorAction Stop
            } catch {
                Start-Process "https://web.whatsapp.com"
            }
            Start-Sleep -Seconds 2

            # If contact name is given, use Ctrl+F to search and select contact
            if ($searchTarget) {
                [System.Windows.Forms.SendKeys]::SendWait("^f")
                Start-Sleep -Milliseconds 500
                [System.Windows.Forms.SendKeys]::SendWait($searchTarget)
                Start-Sleep -Milliseconds 1000
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                Start-Sleep -Milliseconds 800
            }
        }

        # Attach file via Windows clipboard
        if ($filePath -and (Test-Path $filePath)) {
            $absFile = [System.IO.Path]::GetFullPath($filePath)
            Set-Clipboard -Path $absFile
            Start-Sleep -Milliseconds 500
            [System.Windows.Forms.SendKeys]::SendWait("^v")
            Start-Sleep -Milliseconds 800
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        } elseif ($message -and !$cleanPhone) {
            [System.Windows.Forms.SendKeys]::SendWait($message)
            Start-Sleep -Milliseconds 300
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        }

        Write-Output "SUCCESS: WhatsApp launched and prepared for $searchTarget"
    } catch {
        Write-Error "WhatsApp Error: $($_.Exception.Message)"
    }
}
