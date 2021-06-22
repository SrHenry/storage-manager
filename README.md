# Storage Manager

Storage Manager module to wrap Node.js filesystem access with ease. This module is Promise-ready, all methods return promises or stream objects. Both Javascript (CommonJS) and Typescript (ES6+) are supported.


## Installing

```bash
npm install @srhenry/storage-manager --save
```
or from git repository:
```bash
git clone git@gitlab.com:SrHenry/storage-manager.git
cd storage-manager
npm run build
```

## Some examples

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
```