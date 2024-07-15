import { ResponseEntry, ResponseJson } from '../types/responses.js';

export function formatCode(code: string): string {
    return code.replace('_', '[') + ']';
}

export function unformatCode(code: string): string {
    return code.replace('[', '').replace(']', '');
}

export function anonymize(responses: ResponseJson, codesToRemove: string[]): ResponseJson {
    return {
        responses:
            responses.responses.map((entry: ResponseEntry) => {
                const result: ResponseEntry = {};
                for (const key in entry) {
                    if (!codesToRemove.includes(key)) {
                        result[key] = entry[key];
                    }
                }
                return result;
            })
    };
}
