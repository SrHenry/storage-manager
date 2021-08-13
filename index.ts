export * from "./src"

import { StorageManager } from "."

(async () => {
    const path = "dir0"
    console.log("--recursive=false", await StorageManager.listDirectory(path))
    console.log("§§§")
    console.log("--recursive=true", JSON.parse(JSON.stringify(await StorageManager.listDirectory(path, true))))
})();