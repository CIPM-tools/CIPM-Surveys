import * as Plot from '@observablehq/plot';
import { QuestionContainer } from '../logic/question-container.js';
import { ResponseCount } from '../types/response-count.js';
import { convertLongCodeToShortCode, convertResponseCountToPlotItems, fontSize } from './plots-common.js';

export function generateCombinedPlot(count: ResponseCount, questionContainer: QuestionContainer, dom: any): string {
    return Plot.plot({
        grid: true,
        style: { fontSize },
        x: { label: '', axis: 'top', domain: count.questionCodes.map(convertLongCodeToShortCode) },
        fx: { label: '', axis: 'bottom', domain: questionContainer.getResponseValues(count.questionCodes[0]) },
        y: { label: '', labelArrow: 'none' },
        color: { scheme: 'Set1' },
        marks: [
            Plot.frame(),
            Plot.barY(convertResponseCountToPlotItems(count), Plot.groupX({ y: 'identity' }, { x: 'code1', y: 'count', fx: 'code0', fill: 'code1' }))
        ],
        document: dom.window.document
    }).outerHTML;
}
