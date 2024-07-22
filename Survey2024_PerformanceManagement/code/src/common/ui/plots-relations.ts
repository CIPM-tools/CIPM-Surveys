import * as Plot from '@observablehq/plot';
import { QuestionContainer } from '../logic/question-container.js';
import { ResponseCount } from '../types/response-count.js';
import { convertLongCodeToShortCode, convertResponseCountToPlotItems, defaultAngleDeg, fontSize, fontSizeNumber, getMarginRight, getMinimumFontSize } from './plots-common.js';

export function generateRelationPlot(count: ResponseCount, questionContainer: QuestionContainer, dom: any): string {
    const xResponses: string[] = questionContainer.getResponseValues(count.questionCodes[0]);
    const yResponses: string[] = questionContainer.getResponseValues(count.questionCodes[1]);

    const marginLeft: number = getMinimumFontSize(yResponses) * 0.5 + 2 * fontSizeNumber;
    const marginBottom: number = getMinimumFontSize(xResponses, defaultAngleDeg) * 0.6;
    const marginRight: number = getMarginRight(xResponses[xResponses.length - 1], defaultAngleDeg) * 0.6;

    return Plot.plot({
        grid: true,
        marginLeft,
        marginBottom,
        marginRight,
        height: marginBottom + fontSizeNumber * yResponses.length * 2 + fontSizeNumber * 2,
        width: marginLeft + 2 * fontSizeNumber + 450 + marginRight,
        style: { fontSize },
        x: { label: convertLongCodeToShortCode(count.questionCodes[0]),  domain: xResponses, tickRotate: defaultAngleDeg },
        y: { label: convertLongCodeToShortCode(count.questionCodes[1]), domain: yResponses, labelArrow: 'none' },
        marks: [
            Plot.frame(),
            Plot.dot(convertResponseCountToPlotItems(count), { x: 'code0', y: 'code1', r: 'count' })
        ],
        document: dom.window.document
    }).outerHTML;
}
