# Storage Manager

> Storage Manager module to wrap Node.js filesystem access with ease. This module is Promise-ready, all methods return promises or stream objects. Both Javascript (CommonJS) and Typescript (ES6+) are supported.

<br/>
<div align="center">

[![GitHub](https://badgen.net/badge/icon/github?icon=github&label)](https://github.com/SrHenry/storage-manager)
[![GitLab](https://badgen.net/badge/icon/gitlab?icon=gitlab&label)](https://gitlab.com/SrHenry/storage-manager)

[![Npm package version](https://badgen.net/npm/v/@srhenry/storage-manager)](https://npmjs.com/package/@srhenry/storage-manager)
[![Npm package total downloads](https://badgen.net/npm/dt/@srhenry/storage-manager)](https://npmjs.com/package/@srhenry/storage-manager)
[![Npm package license](https://badgen.net/npm/license/@srhenry/storage-manager)](https://npmjs.com/package/@srhenry/storage-manager)
</div>
<br/>

## **Table of Contents**

- [Installing](#installing)
- [Docs](#docs)
- [Examples](#examples)

<br/>
<br/>

## <span id="installing"> **Installing** </span>

```bash
npm install @srhenry/storage-manager --save
```
or from git repository:
```bash
git clone git@gitlab.com:SrHenry/storage-manager.git
cd storage-manager
npm run build
```

<br/>

## <span id="docs"> **Docs** </span>
> - [Gitlab Pages](https://srhenry.gitlab.io/storage-manager)
> - [Github Pages](https://srhenry.github.io/storage-manager)

<br/>

## <span id="examples"> **Some examples** </span>

```typescript
/**
 * Basic file manipulation
 */

import { StorageManager } from "@srhenry/storage-manager"

// Get content from file as string
let content = await StorageManager.get("path/to/file")

// Write content to file
await StorageManager.put("path/to/file", "Hello World!")

// Append content to file
await StorageManager.append("path/to/file", "Tail here :)")

// Check if file or directory exists:
if (await StorageManager.exists("path/to/file")) {
    // Do something if file exists
} else {
    // Do something if file doesn't exist
}

// Create directory (if not exist):
await StorageManager.mkdir("new/path")

// Delete file
await StorageManager.delete("path/to/file")

// Get stream object of a file
let stream = StorageManager.fileStream("path/to/file")

// Fetching directory list from path (no recursion)
let dirs = await StorageManager.listDirectory("path")

/*
    Fetching directory list from path (with recursion).
    It returns a DirectoryList representing given path,
    which is iterable (for..of, spread operator),
    and it contains strings for inner files and another DirectoryList instance for each inner directory.
    You can see directory name in DirectoryList with `name` property accessor.
*/
let dirs_deep = await StorageManager.listDirectory("path", true)

// copying files or directories:
await StorageManager.copy("path/to/file", "new/path")
// copying files or directories (w/ renaming):
await StorageManager.copy("path/to/file", "new/path", "new_name")

// renaming files or directories
await StorageManager.rename("path/to/file", "new_name")

// moving files or directories
await StorageManager.move("path/to/file", "new/path")
// moving files or directories (w/ renaming)
await StorageManager.move("path/to/file", "new/path", "new_name")

// fetching file or directory metadata
// @see https://nodejs.org/api/fs.html#fs_class_fs_stats for further documentation on those metadata
const metadata = await Storage.stats("path/to/file")

let isFile = metadata.isFile() // Returns true if is a file
let isDirectory = metadata.isDirectory() // Returns true if is a directory

// shortand for check if given path is a file
isFile = await StorageManager.isFile("path/to/file")
// shortand for check if given path is a directory
isDirectory = await StorageManager.isDirectory("path/to/file")
```