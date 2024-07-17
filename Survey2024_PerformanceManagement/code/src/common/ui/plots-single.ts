import * as Plot from '@observablehq/plot';
import { ResponseCount } from '../types/response-count.js';
import { convertResponseCountToPlotItems, fontSize } from './plots-common.js';

export function generateSinglePlot(count: ResponseCount, dom: any): string {
    return Plot.plot({
        grid: true,
        style: { fontSize },
        x: { label: '' },
        y: { label: 'Frequency', labelArrow: 'none' },
        color: { scheme: 'Set1' },
        marks: [
            Plot.frame(),
            Plot.barY(convertResponseCountToPlotItems(count), { x: 'code0', y: 'count', fill: 'code0', sort: { x: 'x', order: null } })
        ],
        document: dom.window.document
    }).outerHTML;
}
