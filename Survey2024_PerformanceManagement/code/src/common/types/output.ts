import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';

export class Output {
    constructor(private readonly basePath: string) {}

    saveSvgForDescriptiveStatistic(fileName: string, svg: string): Promise<void> {
        return this.save(resolve(this.basePath, 'output-descriptive', fileName), svg);
    }

    saveSvgForRelation(fileName: string, svg: string): Promise<void> {
        return this.save(resolve(this.basePath, 'output-relation', fileName), svg);
    }

    saveText(fileName: string, text: string): Promise<void> {
        return this.save(resolve(this.basePath, fileName), text);
    }

    private async save(path: string, text: string): Promise<void> {
        const directory: string = dirname(path);
        if (!existsSync(directory)) {
            await mkdir(directory, { recursive: true });
        }
        return writeFile(path, text, { encoding: 'utf-8' });
    }
}
