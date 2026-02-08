' Run setup-hosts-windows.bat with Administrator rights (UAC prompt once)
Set sh = CreateObject("Shell.Application")
bat = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\setup-hosts-windows.bat"
sh.ShellExecute "cmd.exe", "/c """ & bat & """", "", "runas", 1
