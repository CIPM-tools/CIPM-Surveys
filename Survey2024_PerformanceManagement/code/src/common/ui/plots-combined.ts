import * as Plot from '@observablehq/plot';
import { QuestionContainer } from '../logic/question-container.js';
import { ResponseCount } from '../types/response-count.js';
import { convertLongCodeToShortCode, convertResponseCountToPlotItems, defaultAngleDeg, fontSize, fontSizeNumber, getMarginRight, getMinimumFontSize } from './plots-common.js';

export function generateCombinedPlot(count: ResponseCount, questionContainer: QuestionContainer, dom: any): string {
    const shortCodes: string[] = count.questionCodes.map(convertLongCodeToShortCode);
    const responses: string[] = questionContainer.getResponseValues(count.questionCodes[0]);
    const marginRight: number = getMarginRight(responses[responses.length - 1], defaultAngleDeg) * 0.6;
    const marginTop: number = getMinimumFontSize(shortCodes);
    const marginBottom: number = getMinimumFontSize(responses, defaultAngleDeg) * 0.6;

    return Plot.plot({
        grid: true,
        marginRight,
        marginTop,
        marginBottom,
        width: marginRight + shortCodes.length * responses.length * fontSizeNumber * 1.5 + 4 * fontSizeNumber,
        style: { fontSize },
        x: { label: '', axis: 'top', domain: shortCodes, tickRotate: 90 },
        fx: { label: '', axis: 'bottom', domain: responses, tickRotate: defaultAngleDeg },
        y: { label: '', labelArrow: 'none' },
        color: { scheme: 'Set1' },
        marks: [
            Plot.frame(),
            Plot.barY(convertResponseCountToPlotItems(count, { convertCodes: true }), Plot.groupX({ y: 'identity' }, { x: 'code1', y: 'count', fx: 'code0', fill: 'code1' }))
        ],
        document: dom.window.document
    }).outerHTML;
}
