# What's New

## Exporter
### 0.6.4
- Display human readable error messages when trying to export with invalid settings.

### 0.6.3
- Fixed alpha incorrectly masking out RGB when exporting to TGA with Blur or Sharpen enabled (see [issue #14](https://github.com/fcamarlinghi/expresso/issues/14)).

### 0.6.2
- Mac: fixed unresponsive UI.
- Mac: fixed invalid path being returned by *Open Folder* dialogs.

### 0.6.1
- Added support for Photoshop CC 2021.

### 0.6.0
- Added configurable keyboard shortcuts for the *Export All* and *Export Enabled* actions. They can be customized inside the *Edit &rarr; Keyboard Shortcuts* dialog, in the *File &rarr; Scripts* section.
- The same shortcuts are also available in the *File &rarr; Scripts* menu.
- Added support for exporting compressed TGA files (can be enabled in settings, default behavior is unchanged).
- Added support for triggering export from ExtendScript, useful to integrate Expresso into your scripts.
```js
// Load PlugPlug
ExternalObject.PlugPlugExternalObject = new ExternalObject('lib:PlugPlugExternalObject');

// Trigger export
const eventObj = new CSXSEvent(); 
eventObj.type = 'com.expresso.exporter.exportAll'; // Or 'com.expresso.exporter.exportEnabled'
eventObj.data = ''; 
eventObj.dispatch();

// Unload PlugPlug
ExternalObject.PlugPlugExternalObject = undefined;
```
- Fixed naming convention not being correctly applied when exporting from non PSD files (i.e. PSB).
- Fixed error when trying to export enabled targets and no target is actually enabled.

### 0.5.1
- Fixed various issues preventing the extension from working on CC 2015.
- Minor UI fixes and improvements.

### 0.5.0
- Major rewrite of the old extension.
- Improved export capabilities:
    - Exporting sub-groups is now supported.
    - Exporting groups with transparent background is now supported.
    - Exporting documents with non power-of-two sizes is now supported.
- New dropdown menu makes it easier to select the group you want to export by providing the ability to search for it by name (or using regular expressions). Should help when working with complex PSDs.
- Slightly faster exports thanks to a new export engine. The panel now uses Photoshop Remote Server to connect to Photoshop instead of relying on a Generator plugin, which proved to be buggy and hard to maintain.
- Updated UI themes to match the ones introduced in CC 2015.5.
- Supports Photoshop CC 2015, CC 2015.5, CC2017 and CC2018. Dropped support for previous versions.

## Older Versions
### 0.4.3
- General: added support for Photoshop CC 2015.

### 0.4.2
- General: minor improvements to Generator backend.
- Exporter: fixed issue when exporting maps with alpha channel resulting in corrupted RGB values.
- Exporter: fixed issue when exporting using 12.5% as export scale resulting in wrong image size.
- Exporter: JPG exporter now use maximum (100%) compression quality (was 90%).
- Previewer: fixed regression bug introduced in 0.4.1 preventing unlit rendering to work correctly.

### 0.4.1
- General: fixed compatibility with Photoshop CC 2014.2.2.
- General: updated libs to latest versions.

### 0.4.0
- General: updated Adobe CEP libs to version 5.2 (Photoshop CC 2014.2 and up).
- General: implemented flyout menus for panel settings and removed old menus (Photoshop CC 2014.2 and up).
- General: improved settings management, minor UI fixes.
- Previewer: all rendering is now done in linear space. All textures (with the exception of normal maps) are assumed to be in sRGB by default, but this behaviour is controllable by user.
- Previewer: fill lighting is now provided by an Hemisphere light, with support for sky and ground colors.
- Previewer: shader now correctly implements a Lambert model for diffuse and a Blinn-Phong model for specular.
- Previewer: added support for Glossiness map, which works as a multiplier for the Specular Power input.
- Previewer: texture tiling can now be customized.
- Previewer: normal map intensity can now be scaled.
- Previewer: new experimental UI, saves some UI space by showing only the most used settings to user. Other settings are now located into expandable sub-sections.
- Previewer: fixed issue on Mac when selecting files from a different drive when using relative file paths.

### 0.3.0
- General: fixed application settings and logs not being saved on Mac.
- General: updated libs to Ractive 0.6 and THREE.js 0.68.
- General: fixed file selection window not working on Mac.
- General: improved handling of data and errors coming from Generator backend, which should help troubleshooting issues.
- General: several bug fixes and performance enhancements.
- Exporter: fixed some UI issues.
- Exporter: fixed issue preventing normal map normalization on export.
- Exporter: fixed alpha channel not being exported.
- Exporter: exporting with invalid settings, empty layer groups or groups containing only hidden layers will now raise descriptive errors to user.
- Previewer: added support for emissive map and color.
- Previewer: added support for unlit rendering.
- Previewer: fixed bug resulting in panel freeze when trying to load an OBJ file which no longer is at the specified location.

### 0.2.0
- First release of the Previewer panel (0.1.0).
- Added Generator backend for improved performance.
- Updated Exporter to use the new Generator backend. Updated version to 0.2.0.
- Lot of bug fixes and enhancements.

### 0.1.0
- Initial release.
