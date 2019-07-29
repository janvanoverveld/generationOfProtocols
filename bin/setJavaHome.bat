set JAVA_HOME="C:/apps/jdk-12.0.2"
echo %JAVA_HOME%
set PATH=%JAVA_HOME%/bin;%PATH%
echo %PATH%

rem voorbeeld aanroepen zijn
rem java -jar mpstpp.jar glob --project --json AliceBob.scr
rem java -jar mpstpp.jar glob --project --json --out=<directory> AliceBob.scr
rem java -jar mpstpp.jar glob --project --json AliceBob.scr
rem java -jar mpstpp.jar glob --project --json AliceBob.scr > AliceBob.json


java -jar mpstpp.jar glob --project --json MathSvc.scr 