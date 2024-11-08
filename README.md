# Paula's tweaks README

This is my personal extension for Vs Code. That I will gradually update with new features.

## Version
**0.1.0**

## Features

### Breakpoints as Bookmarks
Use the Vs Code Breakpoints as Bookmarks.

Creates a panel near the Output Panel, that lists the Breakpoints and show if they're enabled.

If the breakpoint is a **Logpoint**, it will show the logmessage as well.

You going to want to enable add `"debug.allowBreakpointsEverywhere": true` to your settings.json, otherwise you wont get the bookmarks in any "non-debuggable" files

![Preview](img/image.png)

## Instalation
I have not added, (and probably will not add) the extension to the VsCode Marketplace, so for now, you can install the extension's Developer Version.

To do so:
1. clone/download this repository,
2. open vscode, and then use the `Developer: Install Extension From Location...` command
    - ![Install Extension command](img/command.png)
3. Choose the folder you just cloned and that's it.
4. To update, just pull the main branch, or download it again and overwrite the current instalation.

## Release Notes

### 0.1.0
- Initial release of the Breakpoints as Bookmarks feature.
