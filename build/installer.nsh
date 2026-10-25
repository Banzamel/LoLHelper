; Default install location: next to the game in "<drive>:\Riot Games\LoL Helper" when a
; Riot Games folder exists, otherwise the standard per-user location. The wizard still lets
; the user pick any folder.
!macro preInit
  IfFileExists "T:\Riot Games\*.*" 0 checkC
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "T:\Riot Games\LoL Helper"
    Goto done
  checkC:
  IfFileExists "C:\Riot Games\*.*" 0 done
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\Riot Games\LoL Helper"
  done:
!macroend
