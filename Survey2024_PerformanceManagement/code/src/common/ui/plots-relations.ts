import * as Plot from '@observablehq/plot';
import { QuestionContainer } from '../logic/question-container.js';
import { ResponseCount } from '../types/response-count.js';
import { convertResponseCountToPlotItems, fontSize } from './plots-common.js';

export function generateRelationPlot(count: ResponseCount, questionContainer: QuestionContainer, dom: any): string {
    return Plot.plot({
        grid: true,
        style: { fontSize },
        x: { label: count.questionCodes[0],  domain: questionContainer.getResponseValues(count.questionCodes[0]) },
        y: { label: count.questionCodes[1], domain: questionContainer.getResponseValues(count.questionCodes[1]), labelArrow: 'none' },
        marks: [
            Plot.frame(),
            Plot.dot(convertResponseCountToPlotItems(count), { x: 'code0', y: 'code1', r: 'count' })
        ],
        document: dom.window.document
    }).outerHTML;
}
