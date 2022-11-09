# How to update the NPM package

The NPM package can be published (updated) with the command `npm publish`, note:
- you have to be logged into a npm account with `npm login`
- for this the version number has to be incremented
    > To increment the version number go to the 'package.json' file, and in the JSON object under the "version" key, increment the number in the string by one.
- the file `.npmignore` needs to be updated if there are files that are not desired in the package

To test and see how the uploaded package will look, `npm pack` can be used to create the tarball package.