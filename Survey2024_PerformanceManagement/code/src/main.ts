import { resolve } from 'path';
import { QUESTION_CODES } from './question-codes.js';
import * as Plot from '@observablehq/plot';
import { JSDOM } from 'jsdom';
import { ResponseJson } from './responses.js';
import { Output } from './output.js';
import { readFileContent, unformatCode } from './utility.js';
import { No, OtherCode, Yes } from './constants.js';
import { QuestionContainer } from './question-container.js';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { stringify } from 'csv-stringify/sync'
import { writeFile } from 'fs/promises';
import { ResponseCounter } from './response-counter.js';
import { ResponseCount, SingleResponseCount } from './response-count.js';

type AnalysisResult = {
    responseNumbers: {
        completed: number;
        incomplete: number;
        neverStarted: number;
    };
    counts: ResponseCount[];
    relations: ResponseCount[];
};

async function parseAnswers(): Promise<ResponseJson> {
    return JSON.parse(await readFileContent(resolve('..', 'actual_responses.json')));
}

function getTexts(answers: ResponseJson, code: string): string[] {
    return answers.responses.map((entry) => entry[code]).filter((entry) => typeof entry === 'string' && entry !== '').map((entry) => entry as string);
}

function filterXAxis(svg: string): string {
    const parser: XMLParser = new XMLParser({ ignoreAttributes: false, preserveOrder: true });
    const builder: XMLBuilder = new XMLBuilder({ ignoreAttributes: false, preserveOrder: true });
    const svgObj = parser.parse(svg);
    const toRemove = [];
    for (const obj of svgObj[0].svg) {
        if (obj[':@'] !== undefined && obj[':@']['@_aria-label'].startsWith('x-axis tick')) {
            toRemove.push(obj);
        }
    }
    for (const o of toRemove) {
        svgObj[0].svg.splice(svgObj[0].svg.indexOf(o), 1);
    }
    return builder.build(svgObj);
}

function convertToLowerCaseLetter(idx: number): string {
    return String.fromCharCode('a'.charCodeAt(0) + idx);
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
    const overallResult: AnalysisResult = {
        counts: [],
        relations: [],
        responseNumbers: {
            completed: 0,
            incomplete: 0,
            neverStarted: 0
        }
    };
    
    for (const r of answers.responses) {
        const lp = r['lastpage'];
        if (lp === null || (typeof lp === 'number' && lp <= 0)) {
            overallResult.responseNumbers.neverStarted++;
        } else if (lp === 29) {
            overallResult.responseNumbers.completed++;
        } else {
            overallResult.responseNumbers.incomplete++;
        }
    }

    const responseCounter: ResponseCounter = new ResponseCounter();
    const virtualDom = new JSDOM();
    const output: Output = new Output(resolve('..', 'data', outputDirectory));

    const codesForDescriptiveStatistics: string[] = [
        QUESTION_CODES.D1Country,
        QUESTION_CODES.D2Age,
        QUESTION_CODES.D3Experience,
        QUESTION_CODES.D4Roles,
        QUESTION_CODES.D5CompanySize,
        QUESTION_CODES.D6TeamSize,
        QUESTION_CODES.C1DevMethod,
        QUESTION_CODES.C2Technologies,
        QUESTION_CODES.C3PManagement,
        QUESTION_CODES.C4MonHinder,
        QUESTION_CODES.C4MonTools,
        QUESTION_CODES.C5TestsHinder,
        QUESTION_CODES.C6PredictionHinder,
        QUESTION_CODES.C6PredictionTools,
        QUESTION_CODES.C7Purpose,
        QUESTION_CODES.C8RelevanceSQ001,
        QUESTION_CODES.C8RelevanceSQ002,
        QUESTION_CODES.C9GeneralTrustSQ001,
        QUESTION_CODES.C9GeneralTrustSQ002,
        QUESTION_CODES.C9GeneralTrustSQ003,
        QUESTION_CODES.Ch1QualitySQ001,
        QUESTION_CODES.Ch1QualitySQ002,
        QUESTION_CODES.Ch1QualitySQ003,
        QUESTION_CODES.Ch1QualitySQ004,
        QUESTION_CODES.Ch1QualitySQ005,
        QUESTION_CODES.Ch4PredictionFeatureSQ001,
        QUESTION_CODES.Ch4PredictionFeatureSQ002,
        QUESTION_CODES.Ch4PredictionFeatureSQ003,
        QUESTION_CODES.Ch4PredictionFeatureSQ004,
        QUESTION_CODES.Ch4PredictionFeatureSQ005,
        QUESTION_CODES.N2TrustSQ001,
        QUESTION_CODES.N2TrustSQ002,
        QUESTION_CODES.N2TrustSQ003,
        QUESTION_CODES.Co1DevFactors,
        QUESTION_CODES.Co1PMFactors,
        QUESTION_CODES.Co2DevTimeLearn,
        QUESTION_CODES.Co2PMTimeLearn,
        QUESTION_CODES.Co3DevTimeAdoption,
        QUESTION_CODES.Co3PMTimeAdoption
    ];
    const allSingleResponseCounts: ResponseCount[] = responseCounter.countResponsesForCodes(questionContainer, answers, codesForDescriptiveStatistics, { countRelativeFrequency: true });

    for (const responseCount of allSingleResponseCounts) {
        const svgElement = Plot.plot({
            grid: true,
            style: { fontSize: '14px' },
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

        // await output.saveText(`${unformatCode(coco.questionCodes[0])}.csv`, stringify(responseCount, { header: true, columns: [{ key: 'x', header: 'Responses' }, { key: 'y', header: 'Count' }] }));
    }

    const combinedCodes: string[][] = [
        [QUESTION_CODES.C9GeneralTrustSQ001, QUESTION_CODES.C9GeneralTrustSQ002, QUESTION_CODES.C9GeneralTrustSQ003],
        [QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C9GeneralTrustSQ003, QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C8RelevanceSQ001, QUESTION_CODES.C8RelevanceSQ002],
        [QUESTION_CODES.Co2DevTimeLearn, QUESTION_CODES.Co2PMTimeLearn],
        [QUESTION_CODES.Co3DevTimeAdoption, QUESTION_CODES.Co3PMTimeAdoption]
    ];

    for (const comb of combinedCodes) {
        const combiningCounts: ResponseCount[] = allSingleResponseCounts.filter((count: ResponseCount) => {
            return comb.map((code) => count.questionCodes.includes(code)).some((included) => included === true);
        });
        const combinedData: SingleResponseCount[] = combiningCounts.flatMap((count) => {
            const countsWithQuestionCode = count.counts.slice();
            countsWithQuestionCode.forEach((value) => value.codes.push(...count.questionCodes));
            return countsWithQuestionCode;
        });
        const combinedResponseCount: ResponseCount = { questionCodes: comb, counts: combinedData, stats: [] };
        // overallResult.relations.push(combinedResponseCount);
        const items = questionContainer.getResponseValues(comb[0]);

        let svgElement = Plot.plot({
            grid: true,
            style: { fontSize: '14px' },
            x: { label: '', axis: 'top', domain: comb },
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
            width: 850,
            marginTop: 50,
            marginLeft: 100,
            style: { fontSize: '14px' },
            x: { label: 'Frequency', labelArrow: 'none' },
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
        let legendSvg = svgElement.legend('color', { legend: 'ramp', width: 810, marginLeft: 20 });
        if (svgElement instanceof virtualDom.window.SVGElement) {
            if (legendSvg instanceof virtualDom.window.SVGSVGElement) {
                for (const child of legendSvg.childNodes) {
                    if (child.nodeName !== 'style') {
                        svgElement.appendChild(child.cloneNode(true));
                    }
                }
            }
            svg = svgElement.outerHTML;
        }
        await output.saveSvgForDescriptiveStatistic(`${comb.join('-')}-matrix-abs.svg`, svg);

        svgElement = Plot.plot({
            grid: true,
            width: 850,
            marginTop: 50,
            marginLeft: 100,
            style: { fontSize: '14px' },
            x: { label: 'Frequency (%)', labelArrow: 'none' },
            fy: { label: '' },
            y: { label: '' },
            color: { scheme: 'RdBu', domain: items },
            marks: [
                Plot.frame(),
                Plot.barX(flattenResponseCount(combinedResponseCount, { useRelativeFrequency: true }), Plot.stackX({ order: items }, { x: 'count', fill: 'code0', fy: 'code1' })),
            ],
            document: virtualDom.window.document
        });
        legendSvg = svgElement.legend('color', { legend: 'ramp', width: 810, marginLeft: 20 });
        if (svgElement instanceof virtualDom.window.SVGElement) {
            if (legendSvg instanceof virtualDom.window.SVGSVGElement) {
                for (const child of legendSvg.childNodes) {
                    if (child.nodeName !== 'style') {
                        svgElement.appendChild(child.cloneNode(true));
                    }
                }
            }
            svg = svgElement.outerHTML;
        }
        await output.saveSvgForDescriptiveStatistic(`${comb.join('-')}-matrix-rel.svg`, svg);

        svgElement = Plot.plot({
            grid: true,
            style: { fontSize: '14px' },
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

    const valuesLearn = questionContainer.getResponseValues(QUESTION_CODES.Co2DevTimeLearn);
    const valuesAdoption = questionContainer.getResponseValues(QUESTION_CODES.Co3DevTimeAdoption);
    const newValues = ['Less than 1 week', '1-2 weeks', 'More than 2 weeks'];
    const oldValuesToNewIndices: Map<string, number> = new Map();
    oldValuesToNewIndices.set(valuesLearn[0], 0);
    oldValuesToNewIndices.set(valuesLearn[1], 0);
    oldValuesToNewIndices.set(valuesLearn[2], 0);
    oldValuesToNewIndices.set(valuesLearn[3], 0);
    oldValuesToNewIndices.set(valuesLearn[4], 1);
    oldValuesToNewIndices.set(valuesLearn[5], 2);
    oldValuesToNewIndices.set(valuesAdoption[0], 0);
    oldValuesToNewIndices.set(valuesAdoption[1], 1);
    oldValuesToNewIndices.set(valuesAdoption[2], 2);
    oldValuesToNewIndices.set(valuesAdoption[3], 2);
    oldValuesToNewIndices.set(valuesAdoption[4], 2);

    const codesToMap = [QUESTION_CODES.Co2DevTimeLearn, QUESTION_CODES.Co2PMTimeLearn, QUESTION_CODES.Co3DevTimeAdoption, QUESTION_CODES.Co3PMTimeAdoption];
    const mappedData: SingleResponseCount[] = [];
    for (const code of codesToMap) {
        
        const temporaryMappedData: SingleResponseCount[] = newValues.map((v) => ({ codes: [v, code], count: 0 }));
        const filteredCounts: SingleResponseCount[] = allSingleResponseCounts.filter((c) => c.questionCodes.includes(code)).flatMap((c) => c.counts);
        for (const counts of filteredCounts) {
            temporaryMappedData[oldValuesToNewIndices.get(counts.codes[0]) ?? 0].count += counts.count;
        }
        mappedData.push(...temporaryMappedData);
    }
    const mappedResponseCount = { questionCodes: codesToMap, counts: mappedData, stats: [] };
    overallResult.relations.push(mappedResponseCount);

    const svgElement = Plot.plot({
        grid: true,
        style: { fontSize: '14px' },
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

    const texts: { [key: string]: string[] } = {};
    texts[QUESTION_CODES.Ch2Challenges] = getTexts(answers, QUESTION_CODES.Ch2Challenges);
    texts[QUESTION_CODES.Ch3MissingFeatures] = getTexts(answers, QUESTION_CODES.Ch3MissingFeatures);
    for (const code of questionContainer.getAllCodes()) {
        if (code.endsWith(OtherCode)) {
            texts[code] = getTexts(answers, code);
        }
    }
    await output.saveText('texts.json', JSON.stringify(texts, undefined, 4));

    const codesOneDimension: string[] = [
        QUESTION_CODES.D2Age,
        QUESTION_CODES.D3Experience,
        QUESTION_CODES.D5CompanySize,
        QUESTION_CODES.D6TeamSize
    ];
    const codesOtherDimension: string[] = [
        QUESTION_CODES.C3PManagement,
        QUESTION_CODES.C7Purpose,
        QUESTION_CODES.C8RelevanceSQ001,
        QUESTION_CODES.C8RelevanceSQ002,
        QUESTION_CODES.C9GeneralTrustSQ001,
        QUESTION_CODES.C9GeneralTrustSQ002,
        QUESTION_CODES.C9GeneralTrustSQ003,
        QUESTION_CODES.N2TrustSQ001,
        QUESTION_CODES.N2TrustSQ002,
        QUESTION_CODES.N2TrustSQ003
    ];
    const relatedReponseCounts: ResponseCount[] = responseCounter.countRelatedResponsesForCodes(questionContainer, answers, [codesOneDimension, codesOtherDimension]);

    for (const responseCount of relatedReponseCounts) {
        overallResult.relations.push(responseCount);
        const svgElement = Plot.plot({
            grid: true,
            style: { fontSize: '14px' },
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

    output.saveText('all-results.json', JSON.stringify(overallResult, undefined, 4));
}

async function main(): Promise<void> {
    const questionContainer: QuestionContainer = new QuestionContainer();
    await questionContainer.initialize();
    // await questionContainer.writeCodesToTS();
    questionContainer.addConditions(
        { conditionedCode: QUESTION_CODES.C4MonHinder, required: { code: QUESTION_CODES.C3PManagementC3Mon, value: No } },
        { conditionedCode: QUESTION_CODES.C4MonTools, required: { code: QUESTION_CODES.C3PManagementC3Mon, value: Yes } },
        { conditionedCode: QUESTION_CODES.C5TestsHinder, required: { code: QUESTION_CODES.C3PManagementC3Tests, value: No } },
        { conditionedCode: QUESTION_CODES.C6PredictionHinder, required: { code: QUESTION_CODES.C3PManagementC3Prediction, value: No } },
        { conditionedCode: QUESTION_CODES.C6PredictionTools, required: { code: QUESTION_CODES.C3PManagementC3Prediction, value: Yes } },
        { conditionedCode: QUESTION_CODES.Co1DevFactors, required: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { conditionedCode: QUESTION_CODES.Co1PMFactors, required: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { conditionedCode: QUESTION_CODES.Co2DevTimeLearn, required: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { conditionedCode: QUESTION_CODES.Co2PMTimeLearn, required: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { conditionedCode: QUESTION_CODES.Co3DevTimeAdoption, required: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { conditionedCode: QUESTION_CODES.Co3PMTimeAdoption, required: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } 
    });
    
    const answers: ResponseJson = await parseAnswers();
    await analyzeAnswers(questionContainer, answers, 'results-unfiltered');
    answers.responses = answers.responses.filter((r) => r['lastpage']! === 29);
    await analyzeAnswers(questionContainer, answers, 'results-complete-only');
}

main();
