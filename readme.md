
# *Expresso!*
> *Expresso!* is a free extension for Photoshop CC that tries to improve the texturing workflow for 3D Artists. It provides a set of utility panels that integrates directly into Photoshop to enhance your productivity by speeding up slow, repetitive and error-prone tasks.

*Expresso!* has been recently open-sourced. What you see here is nearly a complete rewrite of the plugin available on [my website](http://minifloppy.it/expresso). Some features from the old version are still missing (most notably the *Previewer* panel) and will be added to the repository over time.

Please see the [What's New](#whats-new) and [Roadmap](#roadmapwishlist) sections below for additional details. Feel free to file issues with feedback or bug reports, or contribute pull requests by following the [Issues & Contributions](#issues--contributions) guidelines.

## Why Github?
Over time *Expresso!* usage has raised beyond my original expectations. As more people relied on the tool (especially on the *Exporter* panel) for their workflow, it became clear that a better way of managing development, bug reports and feedback was needed.

By having the code publicly available on Github, I hope users won't be left down by any lack of time on my part to work on the plugin, and be able to eventually kick-in and keep the tool up to date, or customize it to fit their specific needs.

## Getting *Expresso!*
At the moment, the only way to use the plugin is to build it from source. Binary versions will be released (both here and on Adobe Exchange) in the future.

### Building From Source
Please follow the instructions below to build the plugin. You will need a recent version of NodeJS and NPM on Windows or Mac.

1. First [fork and/or clone](https://guides.github.com/activities/forking/) the repository.
2. Install NPM dependencies using the `npm install` command.
3. Run the `npm run exporter:debug` command to create a debug version of the plugin. This will generate all the needed files in the `build/exporter` folder and start watching for changes you make to the code.

Alternatively, you can create a *ZXP* archive, which can then be installed in Photoshop, using the `npm run exporter:release` command. The archive will be located in the `release` folder. Please note that this way the extension will be built in *release* mode, which enables code optimizations that make debug much harder, if not impossible.

### Debugging
The simplest way to debug the plugin in Photoshop is to create a symbolic link between the `build/exporter` folder and the local Adobe CEP `extensions` folder on your system. This way you'll be able to simply close and reopen the extension in Photoshop, without having to leave the program. Changes you make to the code will be picked-up in realtime.

To create symbolic links on Windows you can use the [Link Shell Extensions](http://schinagl.priv.at/nt/hardlinkshellext/linkshellextension.html) tools. On Mac you can use the `ln -s` command:

```shell
ls -s /path/to/build/exporter /path/to/CEP/extensions/com.expresso.exporter
```

The extension can be debugged just like any other Photoshop extension using the Chrome Developer Tools. Please check out the [Adobe CEP Resources](http://adobe-cep.github.io/CEP-Resources/) page for additional information.

## What's New
Only the **Exporter** panel is currently available in the repository. Main new features and changes from the old plugin are highlighted below:

* Ability to export sub-groups.
* Ability to export groups with transparent background.
* Ability to export documents with non power of two sizes.
* New dropdown menu makes it easier to select the group you want to export by providing the ability to to search for it by name (or using regular expressions). Should help when working with complex PSDs.
* Slightly faster exports thanks to a new export engine. The panel now uses Photoshop Remote Server to connect to Photoshop instead of relying on the old Generator plugin, which turned down to be buggy and hard to maintain.
* *Exporter* panel is no longer bundled with the *Previewer* panel, so users that only need the *Exporter* won't need to install both.
* Support for the new Photoshop CC 2015 themes.

## Roadmap/Wishlist
Some of the things I would like to work on in the near future, alongside user-requested features, are listed below in no particular order. These will be converted to issues over time.

### Core
* Add first-time wizard to instruct users about how to enable Photoshop Remote Server. Find out if there's a way to enable it automatically (through ExtendScript?). Provide a way for users to select the password they want.
* Break up the codebase into smaller chunks (i.e. *expresso-core*, *expresso-exporter*, *expresso-previewer*) for additional flexibility.
* Improve performance and usability on the new *core-combobox* (i.e. support for arrow keys).
* Continue transition to ES2015 for improved code clarity and performance.

### Exporter
* Keyboard shortcuts.
* Support for background matte color when exporting groups with transparent backgrounds.
* Give more control over the blur/sharpen settings.
* UI improvements: visually warn user if some settings are wrong, ability to reorder export targets.
* Auto-export enabled targets when changes are made to the document.
* Ability to drag and drop layers inside the export target instead of having to search for them using the dropdown list.
* Separate, more usable modal dialog for plugin settings (instead of relying on panel context menu).
* Support to optionally save settings to an external file instead of using document XMP data.

### Previewer
* Add back the Previewer panel.
* Built-in PBR rendering.
* Make use of the new export engine for additional performance.
* Support for more mesh formats: i.e. FBX, Collada, etc.
* Auto-refresh preview when changes are made to the document.

## Issues & Contributions
If you have feedback or want to report a bug please first consider searching for open issues that might match your situation and contribute to them.

If you can't find any open issue, please feel free to file a new one. When you report a bug, attach a brief description of the bug alongside steps to reproduce it and your log files. Logs are extremely important and can help out investigating the bug quickly. They can be found by clicking the *View Logs* in the panel context menu, or at the following locations:
```
Windows: C:\Users\<username>\AppData\Roaming\Expresso\Exporter\logs
Mac: /Users/<username>/Library/Logs/Expresso/Exporter
```
**Pull requests are extremely welcome!**

## License
Copyright &copy; 2015-2016 Francesco Camarlinghi

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

