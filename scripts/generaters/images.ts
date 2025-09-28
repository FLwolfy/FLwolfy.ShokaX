import { readdir, readFile } from "node:fs/promises";
import path from "path";

interface ImageData {
  path: string;
  data: Buffer;
}

/**
 * 递归读取文件夹下所有文件
 * @param baseDir 基础目录，例如 source/_data/{theme.assets}
 * @param themeAssets 主题 assets 文件夹名
 * @param subDir 子目录路径（递归使用，初始为空）
 */
async function readFilesRecursive(
  baseDir: string,
  themeAssets: string,
  subDir: string = ""
): Promise<ImageData[]> {
  const fullDir = path.join(baseDir, subDir);
  const entries = await readdir(fullDir, { withFileTypes: true });

  const results: ImageData[] = [];

  for (const entry of entries) {
    const entryPath = path.join(fullDir, entry.name);
    const relativePath = path.join(subDir, entry.name); // 保留子目录结构

    if (entry.isDirectory()) {
      const subResults = await readFilesRecursive(baseDir, themeAssets, relativePath);
      results.push(...subResults);
    } else if (entry.isFile()) {
      const fileContent = await readFile(entryPath);
      results.push({
        path: path.join(themeAssets, relativePath).replace(/\\/g, "/"), // 统一斜杠
        data: fileContent,
      });
    }
  }

  return results;
}

hexo.extend.generator.register("images", async (locals) => {
  const theme = hexo.theme.config;
  const dir = path.join("source/_data", theme.assets);

  try {
    const result = await readFilesRecursive(dir, theme.assets);
    return result;
  } catch (e) {
    hexo.log.error("Failed to read assets directory:", e);
    return [];
  }
});
