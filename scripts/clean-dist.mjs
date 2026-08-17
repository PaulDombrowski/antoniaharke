import { readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const sourceAssetPattern = /\.(cr3)$/i;

const cleanGeneratedAssets = async (directory) => {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await cleanGeneratedAssets(entryPath);
        return;
      }

      if (sourceAssetPattern.test(entry.name) || entry.name === ".DS_Store") {
        await rm(entryPath, { force: true });
      }
    }),
  );
};

await rm(join(distDir, "landing"), { force: true, recursive: true });
await cleanGeneratedAssets(distDir);
