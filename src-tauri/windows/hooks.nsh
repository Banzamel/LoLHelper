; LoL Helper installer hooks (Tauri NSIS template).
;
; Up to 0.12.x LoL Helper was an Electron app (electron-builder, per-user, any folder; the
; default was next to the game). Its data lives in %APPDATA%\LoL Helper and is copied by the
; new app itself on its first start (src-tauri/src/storage/migrate.rs). Here the old app is
; uninstalled - keeping that data - so the two never run side by side, and electron-updater can
; update straight into this installer (it runs it with --updated /S --force-run).
;
; This file is included before the template defines PRODUCTNAME, so names are spelled out.

!include LogicLib.nsh
!include FileFunc.nsh

!define OLD_UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\9872723e-58ea-57ac-ab07-4bdcc373d3b7"
!define OLD_UNINSTALLER "Uninstall LoL Helper.exe"

Var OldDir

; $OldDir: the folder of the old Electron install, empty when there is none.
!macro LOLHELPER_FIND_OLD
  StrCpy $OldDir ""
  ReadRegStr $R0 HKCU "${OLD_UNINSTKEY}" "DisplayIcon" ; "<dir>\LoL Helper.exe,0"
  ${If} $R0 != ""
    ${GetParent} $R0 $R1
    ${If} ${FileExists} "$R1\${OLD_UNINSTALLER}"
      StrCpy $OldDir $R1
    ${EndIf}
  ${EndIf}
!macroend

; The suggested folder in the wizard: where the old app was, else next to the game when a
; Riot Games folder exists (as the Electron installer did). Only while the template still
; suggests its own default, i.e. there is no earlier install of this app.
!define MUI_CUSTOMFUNCTION_GUIINIT LolHelperGuiInit
Function LolHelperGuiInit
  ${If} $INSTDIR == "$LOCALAPPDATA\LoL Helper"
    !insertmacro LOLHELPER_FIND_OLD
    ${If} $OldDir != ""
      StrCpy $INSTDIR $OldDir
    ${ElseIf} ${FileExists} "T:\Riot Games\*.*"
      StrCpy $INSTDIR "T:\Riot Games\LoL Helper"
    ${ElseIf} ${FileExists} "C:\Riot Games\*.*"
      StrCpy $INSTDIR "C:\Riot Games\LoL Helper"
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  !insertmacro LOLHELPER_FIND_OLD
  ${If} $OldDir != ""
    ; A silent update from the Electron app keeps the folder the player chose back then.
    ${If} ${Silent}
    ${AndIf} $INSTDIR == "$LOCALAPPDATA\${PRODUCTNAME}"
      StrCpy $INSTDIR $OldDir
    ${EndIf}
    ; A copy run with _?= works in place and is waited for (the uninstaller would otherwise copy
    ; itself to %TEMP% and return at once). /KEEP_APP_DATA leaves %APPDATA%\LoL Helper alone.
    InitPluginsDir
    CopyFiles /SILENT "$OldDir\${OLD_UNINSTALLER}" "$PLUGINSDIR\old-uninstall.exe"
    ExecWait '"$PLUGINSDIR\old-uninstall.exe" /S /currentuser /KEEP_APP_DATA _?=$OldDir'
    Delete "$OldDir\${OLD_UNINSTALLER}"
    RMDir "$OldDir"
    DeleteRegKey HKCU "${OLD_UNINSTKEY}"
    SetOutPath $INSTDIR
  ${EndIf}
!macroend

; electron-updater asks the installer to start the app when it is done.
!macro NSIS_HOOK_POSTINSTALL
  ${GetOptions} $CMDLINE "--force-run" $R0
  ${IfNot} ${Errors}
    Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'
  ${EndIf}
!macroend
