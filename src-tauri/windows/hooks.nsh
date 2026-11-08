; LoL Helper installer hooks (Tauri NSIS template).
;
; Everything the app writes lives in its install folder (<install>\data), never in the user
; profile, so the folder is never under %USERPROFILE% (AppData included): the default is the old
; Electron install folder or <T:|C:>\Riot Games\LoL Helper. Tauri updates reinstall into the
; current folder (the template remembers it).
;
; Up to 0.12.x LoL Helper was an Electron app (electron-builder, per-user). It is removed here so
; electron-updater can update straight into this installer (it runs it with --updated /S
; --force-run); the new app moves its data out of %APPDATA%\LoL Helper on first start. The old
; uninstall entry is deleted only once the old program files are really gone.
;
; This file is included before the template defines PRODUCTNAME, so names are spelled out.

!include LogicLib.nsh
!include FileFunc.nsh

!define OLD_UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\9872723e-58ea-57ac-ab07-4bdcc373d3b7"
!define OLD_APPKEY "Software\9872723e-58ea-57ac-ab07-4bdcc373d3b7"
!define OLD_UNINSTALLER "Uninstall LoL Helper.exe"
; Files only the Electron build has: while one is there, the old app is still installed.
!define OLD_MARKER "resources\app.asar"

Var OldDir

; $OldDir: the folder of the old Electron install (its uninstall entry still exists), empty
; when there is none.
!macro LOLHELPER_FIND_OLD
  StrCpy $OldDir ""
  ReadRegStr $R0 HKCU "${OLD_UNINSTKEY}" "DisplayIcon" ; "<dir>\LoL Helper.exe,0"
  ${If} $R0 != ""
    ${GetParent} $R0 $OldDir
  ${EndIf}
!macroend

; A folder inside the user profile ($PROFILE: AppData, Desktop…; the template's default is
; $LOCALAPPDATA\LoL Helper) becomes the old Electron folder, else <T:|C:>\Riot Games\LoL Helper.
!macro LOLHELPER_SAFE_DIR
  StrLen $R2 "$PROFILE\"
  StrCpy $R3 "$INSTDIR\" $R2
  ${If} $R3 == "$PROFILE\"
    !insertmacro LOLHELPER_FIND_OLD
    ${If} $OldDir != ""
      StrCpy $R3 "$OldDir\" $R2
    ${EndIf}
    ${If} $OldDir != ""
    ${AndIf} $R3 != "$PROFILE\"
      StrCpy $INSTDIR $OldDir
    ${ElseIf} ${FileExists} "T:\Riot Games\*.*"
      StrCpy $INSTDIR "T:\Riot Games\LoL Helper"
    ${Else}
      StrCpy $INSTDIR "C:\Riot Games\LoL Helper"
    ${EndIf}
  ${EndIf}
!macroend

; The files electron-builder installed (Electron 33): removed by hand when its uninstaller left
; them, because the new app may go into the same folder.
!macro LOLHELPER_DELETE_ELECTRON_FILES
  RMDir /r "$OldDir\resources"
  RMDir /r "$OldDir\locales"
  Delete "$OldDir\LoL Helper.exe"
  Delete "$OldDir\chrome_100_percent.pak"
  Delete "$OldDir\chrome_200_percent.pak"
  Delete "$OldDir\resources.pak"
  Delete "$OldDir\d3dcompiler_47.dll"
  Delete "$OldDir\ffmpeg.dll"
  Delete "$OldDir\libEGL.dll"
  Delete "$OldDir\libGLESv2.dll"
  Delete "$OldDir\vk_swiftshader.dll"
  Delete "$OldDir\vk_swiftshader_icd.json"
  Delete "$OldDir\vulkan-1.dll"
  Delete "$OldDir\icudtl.dat"
  Delete "$OldDir\snapshot_blob.bin"
  Delete "$OldDir\v8_context_snapshot.bin"
  Delete "$OldDir\LICENSE.electron.txt"
  Delete "$OldDir\LICENSES.chromium.html"
!macroend

!macro LOLHELPER_REMOVE_ELECTRON
  !insertmacro LOLHELPER_FIND_OLD
  ${If} $OldDir != ""
    ; Its own uninstaller first, run from a copy with _?= so it works in place and is waited for.
    ${If} ${FileExists} "$OldDir\${OLD_UNINSTALLER}"
      InitPluginsDir
      CopyFiles /SILENT "$OldDir\${OLD_UNINSTALLER}" "$PLUGINSDIR\old-uninstall.exe"
      ExecWait '"$PLUGINSDIR\old-uninstall.exe" /S /KEEP_APP_DATA /currentuser _?=$OldDir'
    ${EndIf}
    ; It has been seen to leave everything in place; then the files go here.
    ${If} ${FileExists} "$OldDir\${OLD_MARKER}"
      !insertmacro LOLHELPER_DELETE_ELECTRON_FILES
    ${EndIf}
    ${If} ${FileExists} "$OldDir\${OLD_MARKER}"
      ; Still there (files in use): keep the old entry so it stays uninstallable, and stop.
      MessageBox MB_ICONSTOP "The old LoL Helper could not be removed from $OldDir. Close it and run the installer again." /SD IDOK
      Abort
    ${EndIf}
    ; The program is gone: its uninstaller, entry and shortcuts follow.
    Delete "$OldDir\${OLD_UNINSTALLER}"
    DeleteRegKey HKCU "${OLD_UNINSTKEY}"
    DeleteRegKey HKCU "${OLD_APPKEY}"
    Delete "$DESKTOP\LoL Helper.lnk"
    Delete "$SMPROGRAMS\LoL Helper.lnk"
    RMDir "$OldDir"
  ${EndIf}
!macroend

; The wizard suggests the safe folder before its directory page.
!define MUI_CUSTOMFUNCTION_GUIINIT LolHelperGuiInit
Function LolHelperGuiInit
  !insertmacro LOLHELPER_SAFE_DIR
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  ; Also covers silent installs (electron-updater) and a folder typed into the wizard. The
  ; template's install section already created the folder it had (SetOutPath before this
  ; hook); when it is redirected, that empty folder goes again (RMDir keeps a non-empty one).
  StrCpy $R4 $INSTDIR
  !insertmacro LOLHELPER_SAFE_DIR
  ${If} $R4 != $INSTDIR
    RMDir $R4
  ${EndIf}
  SetOutPath $INSTDIR
  !insertmacro LOLHELPER_REMOVE_ELECTRON
  SetOutPath $INSTDIR
!macroend

; electron-updater asks the installer to start the app when it is done.
!macro NSIS_HOOK_POSTINSTALL
  ${GetOptions} $CMDLINE "--force-run" $R0
  ${IfNot} ${Errors}
    Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'
  ${EndIf}
!macroend

; Settings, history and the downloaded database go only on a real uninstall where the player
; ticked "Delete the application data"; updates always keep them.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
  ${AndIf} $DeleteAppDataCheckboxState = 1
    RMDir /r "$INSTDIR\data"
  ${EndIf}
  RMDir "$INSTDIR"
!macroend
