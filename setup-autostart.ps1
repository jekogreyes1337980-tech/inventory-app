# Run this script ONCE as Administrator to set up automatic startup
# Right-click this file and select "Run with PowerShell" (or "Run as Administrator")

$batPath = "C:\Users\Jeko\.antigravity-ide\inventory-app\start.bat"
$taskName = "InventoryAppStartup"

$action = New-ScheduledTaskAction -Execute $batPath
$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = "PT15S"  # 15 second delay after login
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force

Write-Host ""
Write-Host "SUCCESS! The Inventory App will now start automatically" -ForegroundColor Green
Write-Host "15 seconds after you log into Windows." -ForegroundColor Green
Write-Host ""
Write-Host "Task Name: $taskName" -ForegroundColor Cyan
Write-Host "You can manage it in Task Scheduler (search for 'Task Scheduler' in Start Menu)" -ForegroundColor Cyan
Write-Host ""
pause
