import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

export function readFileContent(path: string): Promise<string> {
    if (!existsSync(path)) {
        throw new Error(`The file '${path}' does not exist.`);
    }
    return readFile(path, { encoding: 'utf-8' });
}

export function unformatCode(code: string): string {
    return code.replace('[', '').replace(']', '');
}
