import { ResponseCount } from '../types/response-count.js';

export type InternalPlotItems =
    { count: number } & { [key: `code${number}`]: string };

export function convertResponseCountToPlotItems(count: ResponseCount, config?: { useRelativeFrequency?: boolean, convertCodes?: boolean }): InternalPlotItems[] {
    return count.counts.map((singleCount) => {
        const flattenedCount: InternalPlotItems = { count: config?.useRelativeFrequency && singleCount.relativeFrequency ? singleCount.relativeFrequency : singleCount.count };
        singleCount.codes.forEach((code: string, idx: number) => {
            flattenedCount[`code${idx}`] = config?.convertCodes ? convertLongCodeToShortCode(code) : code;
        });
        return flattenedCount;
    });
}

export function convertLongCodeToShortCode(code: string) {
    const matchResult: RegExpMatchArray | null = code.match(/^([a-zA-Z]+[0-9]+)[a-zA-Z]+(?:\[[a-zA-Z]+([0-9]+)\])?$/);
    if (matchResult) {
        return matchResult[1] + (matchResult[2] ? convertToLowerCaseLetter(Number.parseInt(matchResult[2]) - 1) : '');
    } else {
        return code;
    }
}

function convertToLowerCaseLetter(idx: number): string {
    return String.fromCharCode('a'.charCodeAt(0) + idx);
}

export const fontSizeNumber: number = 16;
export const fontSize: string = fontSizeNumber + 'px';
