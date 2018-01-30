# *Expresso!*
*Expresso!* is a free extension for Photoshop CC that tries to improve the texturing workflow for 3D Artists.

It provides a set of utility panels that integrates directly into Photoshop to enhance your productivity by speeding up slow, repetitive and error-prone tasks.

## Getting *Expresso!*
A compiled version of the plugin is [available for download](http://minifloppy.it/portfolio/expresso/). See what's new in the [changelog](http://github.com/fcamarlinghi/expresso/blob/master/changelog.md). Please note that only the **Exporter** panel is currently available in the repository.

### Building From Source
You will need a recent version of NodeJS and NPM on Windows or Mac to build the plugin.

1. First [fork and/or clone](https://guides.github.com/activities/forking/) the repository.
2. Install NPM dependencies using the `npm install` command.
3. Create a text file called *cepy.certificate.js* in the `<project_root>/scripts/distrib/` folder, and add the following content to it. Replace 'Your name' and 'Your password' with a name and a password of your choice. This information will be used to sign the extension package.

``` js
module.exports = {
    owner: 'Your name',
    file: 'scripts/distrib/cepy.certificate.p12',
    password: 'Your password',
};
```

4. Run the `npm run exporter:debug` command to create a debug version of the plugin. This will generate all the needed files in the `<project_root>/build/com.expresso.exporter` folder and start watching for changes you make to the code.

To create a redistributable *ZXP* archive which can be installed in Photoshop, use the `npm run exporter:release` command. The archive will be generated in the `<project_root>/release` folder.

### Debugging
The simplest way to debug the plugin in Photoshop is to create a symbolic link between the `<project_root>/build/com.expresso.exporter` folder and the local Adobe CEP `extensions` folder on your system. This way you'll be able to simply close and reopen the extension in Photoshop to make it pick-up the changes you did to the code (without having to restart the application).

To create symbolic links on Windows you can use the [Link Shell Extensions](http://schinagl.priv.at/nt/hardlinkshellext/linkshellextension.html) tools. On Mac you can use the `ln -s` command:

```shell
ls -s /path/to/build/exporter /path/to/CEP/extensions/com.expresso.exporter
```

If you're using Visual Studio Code as your IDE you can attach it directly to the Chrome Embeded Framework process by using one of the provided launch profiles.

The extension can also be debugged just like any other Photoshop extension using the Chrome Developer Tools. Please check out the [Adobe CEP Resources](http://adobe-cep.github.io/CEP-Resources/) page for additional information.

## Contributing
Contributions are extremely welcome! Feel free to file issues or open pull requests.

## License
Copyright &copy; 2015 Francesco Camarlinghi

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
