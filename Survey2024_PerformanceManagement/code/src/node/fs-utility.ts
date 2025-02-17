import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';

export function readFileContent(path: string): Promise<string> {
    if (!existsSync(path)) {
        throw new Error(`The file '${path}' does not exist.`);
    }
    return readFile(path, { encoding: 'utf-8' });
}

export function writeFileContent(path: string, content: string): Promise<void> {
    return writeFile(path, content, { encoding: 'utf8' });
}
