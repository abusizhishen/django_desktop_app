@echo off
setlocal

REM 获取当前路径和项目名称
set "project_path=%cd%"
for %%F in ("%project_path%") do set "project_name=%%~nxF"

REM 设置目标目录
set "dir=%USERPROFILE%\Downloads\%project_name%"

REM 删除目标目录
rmdir /s /q "%dir%"

REM 复制项目目录到目标目录
xcopy /e /i /h "%project_path%" "%dir%"

REM 定义需要删除的文件或目录列表
set files_to_remove=.git .gitignore .idea .DS_Store build.sh

REM 遍历列表并删除每个文件或目录
for %%F in (%files_to_remove%) do (
    if exist "%dir%\%%F" (
        rmdir /s /q "%dir%\%%F"
        del /q "%dir%\%%F"
    )
)

REM 进入 Downloads 目录并压缩项目文件
cd /d "%USERPROFILE%\Downloads"
powershell -command "Compress-Archive -Path '%project_name%' -DestinationPath '%project_name%.zip'"

REM 删除项目目录
rmdir /s /q "%dir%"

endlocal
