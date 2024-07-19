import * as Plot from '@observablehq/plot';
import { QuestionContainer } from '../logic/question-container.js';
import { MatrixSpecificGraphics } from '../types/matrix-graphics.js';
import { ResponseCount } from '../types/response-count.js';
import { ResponseJson } from '../types/responses.js';
import { convertLongCodeToShortCode, convertResponseCountToPlotItems, fontSize, fontSizeNumber, getMinimumFontSize } from './plots-common.js';

export function generateMatrixPlots(count: ResponseCount, questionContainer: QuestionContainer, answers: ResponseJson, dom: any): MatrixSpecificGraphics {
    const items = questionContainer.getResponseValues(count.questionCodes[0]);
    const shortCodes = count.questionCodes.map(convertLongCodeToShortCode);

    const height: number = items.length * 1.5 * fontSizeNumber;
    const marginLeft: number = getMinimumFontSize(shortCodes);
    
    const absolute: string = Plot.plot({
        grid: true,
        height,
        marginLeft,
        style: { fontSize },
        x: { label: '', labelArrow: 'none' },
        fy: { label: '' },
        y: { label: '' },
        color: { scheme: 'RdBu', domain: items, label: '', legend: true },
        marks: [
            Plot.frame(),
            Plot.barX(convertResponseCountToPlotItems(count, { convertCodes: true }),
                Plot.stackX(
                    {
                        order: items,
                        offset: (indices, x1, x2, z) => {
                            for (const stacks of indices) {
                                for (const stack of stacks) {
                                    const actualOffset: number =
                                        stack
                                        .map((idx) => {
                                            const itemsIdx: number = items.indexOf(z[idx]);
                                            const mid: number = Math.floor(items.length / 2);
                                            const partOffset: number = (x2[idx] - x1[idx]) * (itemsIdx < mid ? -1 : (itemsIdx === mid ? -0.5 : 0));
                                            return partOffset;
                                        })
                                        .reduce((previousValue, currentValue) => previousValue + currentValue);
                                    for (const idx of stack) {
                                        x1[idx] += actualOffset;
                                        x2[idx] += actualOffset;
                                    }
                                }
                            }
                        }
                    },
                    {
                        x: 'count',
                        fy: 'code1',
                        fill: 'code0'
                    }
                )
            )
        ],
        document: dom.window.document
    }).outerHTML;

    const relative: string = Plot.plot({
        grid: true,
        height: height + 3 * fontSizeNumber,
        marginLeft,
        marginBottom: 3 * fontSizeNumber,
        style: { fontSize },
        x: { label: 'Relative Frequency', labelArrow: 'none' },
        fy: { label: '' },
        y: { label: '' },
        color: { scheme: 'RdBu', domain: items, label: '', legend: true },
        marks: [
            Plot.frame(),
            Plot.barX(convertResponseCountToPlotItems(count, { useRelativeFrequency: true, convertCodes: true }), Plot.stackX({ order: items }, { x: 'count', fill: 'code0', fy: 'code1' })),
        ],
        document: dom.window.document
    }).outerHTML;

    const box: string = Plot.plot({
        grid: true,
        style: { fontSize },
        x: { label: '' },
        y: { label: '', labelArrow: 'none' },
        marks: [
            Plot.frame(),
            Plot.boxY(
                answers.responses.flatMap((entry) => {
                    const responses: { code: string; value: number }[] = [];
                    count.questionCodes.forEach((code) => {
                        if (entry[code]) {
                            responses.push({ code: convertLongCodeToShortCode(code), value: items.indexOf(entry[code] as string) - items.length / 2 });
                        }
                    });
                    return responses;
                }),
                { y: 'value', x: 'code' }
            )
        ],
        document: dom.window.document
    }).outerHTML;

    return { absolute, relative, box };
}
