import * as Plot from '@observablehq/plot';
import { ResponseCount } from '../types/response-count.js';
import { convertResponseCountToPlotItems, defaultAngleDeg, fontSize, fontSizeNumber, getMarginRight, getMinimumFontSize } from './plots-common.js';

export function generateSinglePlot(count: ResponseCount, dom: any): string {
    const responses: string[] = count.counts.flatMap((v) => v.codes);

    return Plot.plot({
        grid: true,
        marginTop: 2 * fontSizeNumber,
        marginBottom: getMinimumFontSize(responses, defaultAngleDeg) * 0.55,
        marginRight: getMarginRight(responses[responses.length - 1], defaultAngleDeg) * 0.6,
        style: { fontSize },
        x: { label: '', tickRotate: defaultAngleDeg },
        y: { label: 'Frequency', labelArrow: 'none' },
        color: { scheme: 'Set1' },
        marks: [
            Plot.frame(),
            Plot.barY(convertResponseCountToPlotItems(count), { x: 'code0', y: 'count', fill: 'code0', sort: { x: 'x', order: null } })
        ],
        document: dom.window.document
    }).outerHTML;
}
