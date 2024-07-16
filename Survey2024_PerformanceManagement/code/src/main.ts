import { resolve } from 'path';
import { QUESTION_CODES } from './node/question-codes.js';
import * as Plot from '@observablehq/plot';
import { JSDOM } from 'jsdom';
import { ResponseJson } from './common/types/responses.js';
import { Output } from './common/types/output.js';
import { QuestionContainer } from './common/logic/question-container.js';
import { ResponseCounter } from './common/logic/response-counter.js';
import { ResponseCount, SingleResponseCount } from './common/types/response-count.js';
import { unformatCode } from './common/logic/utility.js';

function convertToLowerCaseLetter(idx: number): string {
    return String.fromCharCode('a'.charCodeAt(0) + idx);
}

function convertLongCodeToShortCode(code: string) {
    const matchResult: RegExpMatchArray | null = code.match(/^([a-zA-Z]+[0-9]+)[a-zA-Z]+(?:\[[a-zA-Z]+([0-9]+)\])?$/);
    if (matchResult) {
        return matchResult[1] + (matchResult[2] ? convertToLowerCaseLetter(Number.parseInt(matchResult[2]) - 1) : '');
    } else {
        return code;
    }
}

type InternalDisplayableItems =
    { count: number } & { [key: `code${number}`]: string };

function flattenResponseCount(count: ResponseCount, config?: { useRelativeFrequency?: boolean }): InternalDisplayableItems[] {
    return count.counts.map((singleCount) => {
        const flattenedCount: InternalDisplayableItems = { count: config?.useRelativeFrequency && singleCount.relativeFrequency ? singleCount.relativeFrequency : singleCount.count };
        singleCount.codes.forEach((code: string, idx: number) => {
            flattenedCount[`code${idx}`] = code;
        });
        return flattenedCount;
    });
}

async function analyzeAnswers(questionContainer: QuestionContainer, answers: ResponseJson, outputDirectory: string): Promise<void> {
    const responseCounter: ResponseCounter = new ResponseCounter();
    const virtualDom = new JSDOM();
    const output: Output = new Output(resolve('..', 'data', outputDirectory));

    const fontSizeNumber: number = 16;
    const fontSize: string = fontSizeNumber + 'px';

    const codesForDescriptiveStatistics: string[] = [];
    const allSingleResponseCounts: ResponseCount[] = responseCounter.countResponsesForCodes(questionContainer, answers, codesForDescriptiveStatistics, { countRelativeFrequency: true });

    for (const responseCount of allSingleResponseCounts) {
        const svgElement = Plot.plot({
            grid: true,
            style: { fontSize },
            x: { label: '' },
            y: { label: '# Responses', labelArrow: 'none' },
            marks: [
                Plot.frame(),
                Plot.barY(flattenResponseCount(responseCount), { x: 'code0', y: 'count', sort: { x: 'x', order: null } })
            ],
            document: virtualDom.window.document
        });
        const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForDescriptiveStatistic(`${unformatCode(responseCount.questionCodes[0])}.svg`, svg);
    }

    const combinedCodes: string[][] = [];
    for (const comb of combinedCodes) {
        const combiningCounts: ResponseCount[] = allSingleResponseCounts.filter((count: ResponseCount) => {
            return comb.map((code) => count.questionCodes.includes(code)).some((included) => included === true);
        });
        const combinedData: SingleResponseCount[] = combiningCounts.flatMap((count) => {
            const countsWithQuestionCode = count.counts.slice();
            countsWithQuestionCode.forEach((value) => value.codes.push(...count.questionCodes.map(convertLongCodeToShortCode)));
            return countsWithQuestionCode;
        });
        const combinedResponseCount: ResponseCount = { questionCodes: comb, counts: combinedData, stats: [] };
        const items = questionContainer.getResponseValues(comb[0]);

        let svgElement = Plot.plot({
            grid: true,
            style: { fontSize },
            x: { label: '', axis: 'top', domain: comb.map(convertLongCodeToShortCode) },
            fx: { label: '', axis: 'bottom', domain: questionContainer.getResponseValues(comb[0]) },
            y: { label: '', labelArrow: 'none' },
            color: { scheme: 'Set1' },
            marks: [
                Plot.frame(),
                Plot.barY(flattenResponseCount(combinedResponseCount), Plot.groupX({ y: 'identity' }, { x: 'code1', y: 'count', fx: 'code0', fill: 'code1' }))
            ],
            document: virtualDom.window.document
        });
        let svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForDescriptiveStatistic(`${comb.join('-')}-choices.svg`, svg);

        svgElement = Plot.plot({
            grid: true,
            height: items.length * 1.5 * fontSizeNumber,
            marginLeft: fontSizeNumber * comb.map(convertLongCodeToShortCode).map((value) => value.length).reduce((previousValue, currentValue) => previousValue <= currentValue ? currentValue : previousValue),
            style: { fontSize },
            x: { label: '', labelArrow: 'none' },
            fy: { label: '' },
            y: { label: '' },
            color: { scheme: 'RdBu', domain: items, label: '' },
            marks: [
                Plot.frame(),
                Plot.barX(flattenResponseCount(combinedResponseCount),
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
            document: virtualDom.window.document
        });
        svg = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForDescriptiveStatistic(`${comb.join('-')}-matrix-abs.svg`, svg);

        svgElement = Plot.plot({
            grid: true,
            style: { fontSize },
            x: { label: '', labelArrow: 'none' },
            fy: { label: '' },
            y: { label: '' },
            color: { scheme: 'RdBu', domain: items, label: '' },
            marks: [
                Plot.frame(),
                Plot.barX(flattenResponseCount(combinedResponseCount, { useRelativeFrequency: true }), Plot.stackX({ order: items }, { x: 'count', fill: 'code0', fy: 'code1' })),
            ],
            document: virtualDom.window.document
        });
        svg = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForDescriptiveStatistic(`${comb.join('-')}-matrix-rel.svg`, svg);

        svgElement = Plot.plot({
            grid: true,
            style: { fontSize },
            x: { label: '' },
            y: { label: '', labelArrow: 'none' },
            marks: [
                Plot.frame(),
                Plot.boxY(
                    answers.responses.flatMap((entry) => {
                        const responses: { code: string; value: number }[] = [];
                        comb.forEach((code) => {
                            if (entry[code]) {
                                responses.push({ code, value: items.indexOf(entry[code] as string) - items.length / 2 });
                            }
                        });
                        return responses;
                    }),
                    { y: 'value', x: 'code' }
                )
            ],
            document: virtualDom.window.document
        });
        svg = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForDescriptiveStatistic(`${comb.join('-')}-matrix-box.svg`, svg);
    }

    const newValues = ['Less than 1 week', '1-2 weeks', 'More than 2 weeks'];
    const codesToMap = [QUESTION_CODES.Co2DevTimeLearn, QUESTION_CODES.Co2PMTimeLearn, QUESTION_CODES.Co3DevTimeAdoption, QUESTION_CODES.Co3PMTimeAdoption];
    const mappedData: SingleResponseCount[] = [];
    const mappedResponseCount = { questionCodes: codesToMap, counts: mappedData, stats: [] };

    const svgElement = Plot.plot({
        grid: true,
        style: { fontSize },
        x: { label: '', axis: 'top' },
        fx: { label: '', axis: 'bottom', domain: newValues },
        y: { label: '# Responses', labelArrow: 'none' },
        color: { scheme: 'Set1' },
        marks: [
            Plot.frame(),
            Plot.barY(flattenResponseCount(mappedResponseCount), Plot.groupX({ y: 'identity' }, { x: 'code1', y: 'count', fx: 'code0', fill: 'code1' })),
        ],
        document: virtualDom.window.document
    });
    const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
    await output.saveSvgForDescriptiveStatistic(`${codesToMap.join('-')}.svg`, svg);

    const codesOneDimension: string[] = [];
    const codesOtherDimension: string[] = [];
    const relatedReponseCounts: ResponseCount[] = responseCounter.countRelatedResponsesForCodes(questionContainer, answers, [codesOneDimension, codesOtherDimension]);

    for (const responseCount of relatedReponseCounts) {
        const svgElement = Plot.plot({
            grid: true,
            style: { fontSize },
            x: { label: responseCount.questionCodes[0],  domain: questionContainer.getResponseValues(responseCount.questionCodes[0]) },
            y: { label: responseCount.questionCodes[1], domain: questionContainer.getResponseValues(responseCount.questionCodes[1]), labelArrow: 'none' },
            marks: [
                Plot.frame(),
                Plot.dot(flattenResponseCount(responseCount), { x: 'code0', y: 'code1', r: 'count' })
            ],
            document: virtualDom.window.document
        });
        const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForRelation(responseCount.questionCodes.map(unformatCode).join('x') + '.svg', svg);
    }
}

async function main(): Promise<void> {
    const questionContainer: QuestionContainer = new QuestionContainer({ conditions: [], introduction: { infoAfter: '', infoBefore: '', title: '' }, sections: [] });    
    const answers: ResponseJson = { responses: [] };
    await analyzeAnswers(questionContainer, answers, 'results-unfiltered');
    answers.responses = answers.responses.filter((r) => r['lastpage']! === 29);
    await analyzeAnswers(questionContainer, answers, 'results-complete-only');
}

main();
