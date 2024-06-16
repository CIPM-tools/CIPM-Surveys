import { resolve } from 'path';
import { QUESTION_CODES } from './question-codes.js';
import * as Plot from '@observablehq/plot';
import { JSDOM } from 'jsdom';
import { ResponseJson } from './responses.js';
import { Output } from './output.js';
import { readFileContent, unformatCode } from './utility.js';
import { OtherCode } from './constants.js';
import { QuestionContainer } from './question-container.js';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { writeFile } from 'fs/promises';

const NoAnswer: string = 'No Answer';
const Yes: string = 'Yes';
const No: string = 'No';

type RelationResult = {
    codes: string[];
    data: Triple[]
};

type AnalysisResult = {
    responseNumbers: {
        completed: number;
        incomplete: number;
        neverStarted: number;
    };
    counts: { [code: string]: Tuple[] };
    relations: RelationResult[];
};

async function parseAnswers(): Promise<ResponseJson> {
    return JSON.parse(await readFileContent(resolve('..', 'results.json')));
}

type Tuple = {
    x: string;
    y: number;
};

type Triple = Tuple & { z: string; };

type Condition = {
    code: string;
    value: string;
};

type CodeConditionPair = {
    code: string;
    condition?: Condition;
    responseValueMapping?: Map<string, string>;
};

function countResponseOccurrences(answers: ResponseJson, { code, condition, responseValueMapping }: CodeConditionPair, responseValues: string[]): Tuple[] {
    const result: Tuple[] = responseValues.map((value) => ({ x: value, y: 0 }));
    let noAnswerCount: number = 0;
    for (const entry of answers.responses) {
        if (condition && entry[condition.code] !== condition.value) {
            continue;
        }
        if (responseValueMapping) {
            for (const tup of result) {
                if (entry[tup.x] === Yes) {
                    tup.y++;
                }
            }
        } else if (entry[code] !== '') {
            result.filter((x) => x.x === entry[code]).forEach((x) => x.y++);
        } else {
            noAnswerCount++;
        }
    }
    // if (noAnswerCount > 0) {
    //     result.push({ x: NoAnswer, y: noAnswerCount });
    // }
    if (responseValueMapping) {
        for (const tup of result) {
            tup.x = responseValueMapping.get(tup.x) ?? tup.x;
        }
    }
    return result;
}

function getTexts(answers: ResponseJson, code: string): string[] {
    return answers.responses.map((entry) => entry[code]).filter((entry) => typeof entry === 'string' && entry !== '').map((entry) => entry as string);
}

type LabeledCondition = Condition & { label: string; };

type CodeRelation = {
    first: LabeledCondition;
    second: LabeledCondition;
};

function createConditions(questionContainer: QuestionContainer, code: string): LabeledCondition[] {
    const responses: string[] | undefined = questionContainer.getResponses(code);
    if (responses.length === 0) {
        throw new Error(`Illegal code '${code}'. No responses found.`);
    }
    if (questionContainer.getQuestionType(code) === 'mulitple-choice') {
        return responses.map((responseCode) => ({ code: responseCode, value: Yes, label: questionContainer.getResponses(responseCode)[0] }));
    } else {
        return responses.map((responseValue) => ({ code: code, value: responseValue, label: responseValue }));
    }
}

function createRelation(questionContainer: QuestionContainer, codeOne: string, codeTwo: string): CodeRelation[] {
    const conditionsOne: LabeledCondition[] = createConditions(questionContainer, codeOne);
    const conidtionsTwo: LabeledCondition[] = createConditions(questionContainer, codeTwo);
    const result: CodeRelation[] = [];
    for (const c1 of conditionsOne) {
        for (const c2 of conidtionsTwo) {
            result.push({ first: c1, second: c2 });
        }
    }
    return result;
}

function countRelationOccurrences(questionContainer: QuestionContainer, answers: ResponseJson, codeOne: string, codeTwo: string): Triple[] {
    const relations: CodeRelation[] = createRelation(questionContainer, codeOne, codeTwo);
    const result: Triple[] = [];
    for (const rel of relations) {
        const nextTriple: Triple = { x: rel.first.label, z: rel.second.label, y: 0 };
        for (const response of answers.responses) {
            if (response[rel.first.code] === rel.first.value && response[rel.second.code] === rel.second.value) {
                nextTriple.y++;
            }
        }
        result.push(nextTriple);
    }
    return result;
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

async function main(): Promise<void> {
    const questionContainer: QuestionContainer = new QuestionContainer();
    await questionContainer.initialize();
    await questionContainer.writeCodesToTS();

    const overallResult: AnalysisResult = {
        counts: {},
        relations: [],
        responseNumbers: {
            completed: 0,
            incomplete: 0,
            neverStarted: 0
        }
    };
    
    const answers: ResponseJson = await parseAnswers();
    // answers.responses = answers.responses.filter((r) => r['lastpage']! === 29);
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

    const virtualDom = new JSDOM();
    const output: Output = new Output(resolve('..', 'output'));

    const codesForDescriptiveStatistics: CodeConditionPair[] = [
        { code: QUESTION_CODES.D2Age },
        { code: QUESTION_CODES.D3Experience },
        { code: QUESTION_CODES.D4Roles },
        { code: QUESTION_CODES.D5CompanySize },
        { code: QUESTION_CODES.D6TeamSize },
        { code: QUESTION_CODES.C1DevMethod },
        { code: QUESTION_CODES.C2Technologies },
        { code: QUESTION_CODES.C3PManagement },
        { code: QUESTION_CODES.C4MonHinder, condition: { code: QUESTION_CODES.C3PManagementC3Mon, value: No } },
        { code: QUESTION_CODES.C4MonTools, condition: { code: QUESTION_CODES.C3PManagementC3Mon, value: Yes } },
        { code: QUESTION_CODES.C5TestsHinder, condition: { code: QUESTION_CODES.C3PManagementC3Tests, value: No } },
        { code: QUESTION_CODES.C6PredictionHinder, condition: { code: QUESTION_CODES.C3PManagementC3Prediction, value: No } },
        { code: QUESTION_CODES.C6PredictionTools, condition: { code: QUESTION_CODES.C3PManagementC3Prediction, value: Yes } },
        { code: QUESTION_CODES.C7Purpose },
        { code: QUESTION_CODES.C8RelevanceSQ001 },
        { code: QUESTION_CODES.C8RelevanceSQ002 },
        { code: QUESTION_CODES.C9GeneralTrustSQ001 },
        { code: QUESTION_CODES.C9GeneralTrustSQ002 },
        { code: QUESTION_CODES.C9GeneralTrustSQ003 },
        { code: QUESTION_CODES.Ch1QualitySQ001 },
        { code: QUESTION_CODES.Ch1QualitySQ002 },
        { code: QUESTION_CODES.Ch1QualitySQ003 },
        { code: QUESTION_CODES.Ch1QualitySQ004 },
        { code: QUESTION_CODES.Ch1QualitySQ005 },
        { code: QUESTION_CODES.Ch4PredictionFeatureSQ001 },
        { code: QUESTION_CODES.Ch4PredictionFeatureSQ002 },
        { code: QUESTION_CODES.Ch4PredictionFeatureSQ003 },
        { code: QUESTION_CODES.Ch4PredictionFeatureSQ004 },
        { code: QUESTION_CODES.Ch4PredictionFeatureSQ005 },
        { code: QUESTION_CODES.N2TrustSQ001 },
        { code: QUESTION_CODES.N2TrustSQ002 },
        { code: QUESTION_CODES.N2TrustSQ003 },
        { code: QUESTION_CODES.Co1DevFactors, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co1PMFactors, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { code: QUESTION_CODES.Co2DevTimeLearn, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co2PMTimeLearn, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { code: QUESTION_CODES.Co3DevTimeAdoption, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co3PMTimeAdoption, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } }
    ];
    const tuples: Map<string, Tuple[]> = new Map();
    for (const coco of codesForDescriptiveStatistics) {
        if (questionContainer.getQuestionType(coco.code) === 'mulitple-choice') {
            coco.responseValueMapping = questionContainer.getResponseCodeValueMapping(coco.code);
        }
        const responseCount: Tuple[] = countResponseOccurrences(answers, coco, questionContainer.getResponses(coco.code));
        tuples.set(coco.code, responseCount);
        const svgElement = Plot.plot({
            grid: true,
            x: { label: '' },
            y: { label: '' },
            marks: [
                Plot.frame(),
                Plot.barY(responseCount, { x: 'x', y: 'y', sort: { x: 'x', order: null } })
            ],
            document: virtualDom.window.document
        });
        const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        await output.saveSvgForDescriptiveStatistic(`${unformatCode(coco.code)}.svg`, svg);
    }

    const combinedCodes: string[][] = [
        [QUESTION_CODES.C9GeneralTrustSQ001, QUESTION_CODES.C9GeneralTrustSQ002, QUESTION_CODES.C9GeneralTrustSQ003],
        [QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C9GeneralTrustSQ003, QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C8RelevanceSQ001, QUESTION_CODES.C8RelevanceSQ002],
        [QUESTION_CODES.Co2DevTimeLearn, QUESTION_CODES.Co2PMTimeLearn],
        [QUESTION_CODES.Co3DevTimeAdoption, QUESTION_CODES.Co3PMTimeAdoption]
    ];
    const combinedData: { codes: string[]; data: Triple[]; }[] = [];
    for (const comb of combinedCodes) {
        combinedData.push({
            codes: comb,
            data: comb.flatMap((code) => tuples.get(code)?.map((v) => ({ x: v.x, y: v.y, z: code } as Triple)) ?? [])
        });
    }
    for (const comb of combinedData) {
        overallResult.relations.push(comb);
        const svgElement = Plot.plot({
            grid: true,
            x: { label: '', axis: 'top', domain: comb.codes.map((_, idx) => convertToLowerCaseLetter(idx)) },
            fx: { label: '', axis: 'bottom', domain: questionContainer.getResponseValues(comb.codes[0]) },
            y: { label: '' },
            color: { scheme: 'Category10' },
            marks: [
                Plot.frame(),
                Plot.barY(comb.data.map((v) => ({ x: v.x, y: v.y, z: convertToLowerCaseLetter(comb.codes.indexOf(v.z)) })), Plot.groupX({ y: 'identity' }, { x: 'z', y: 'y', fx: 'x', fill: 'z' })),
            ],
            document: virtualDom.window.document
        });
        const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
        // svg = filterXAxis(svg);
        await output.saveSvgForDescriptiveStatistic(`${comb.codes.join('-')}.svg`, svg);
    }

    const valuesLearn = questionContainer.getResponses(QUESTION_CODES.Co2DevTimeLearn);
    const valuesAdoption = questionContainer.getResponses(QUESTION_CODES.Co3DevTimeAdoption);
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
    const mappedData: Triple[] = [];
    for (const code of codesToMap) {
        const temporaryMappedData: Triple[] = newValues.map((v) => ({ x: v, y: 0, z: code }));
        const tuple: Tuple[] = tuples.get(code) ?? [];
        for (const tup of tuple) {
            temporaryMappedData[oldValuesToNewIndices.get(tup.x) ?? 0].y += tup.y;
        }
        mappedData.push(...temporaryMappedData);
    }
    overallResult.relations.push({ codes: codesToMap, data: mappedData });

    const svgElement = Plot.plot({
        grid: true,
        x: { label: '', axis: 'top', domain: codesToMap.map((_, idx) => convertToLowerCaseLetter(idx)) },
        fx: { label: '', axis: 'bottom', domain: newValues },
        y: { label: '' },
        color: { scheme: 'Category10' },
        marks: [
            Plot.frame(),
            Plot.barY(mappedData.map((v) => ({ x: v.x, y: v.y, z: convertToLowerCaseLetter(codesToMap.indexOf(v.z)) }), Plot.groupX({ y: 'identity' }, { x: 'z', y: 'y', fx: 'x', fill: 'z' }))),
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
    for (const codeOne of codesOneDimension) {
        for (const codeTwo of codesOtherDimension) {
            const count: Triple[] = countRelationOccurrences(questionContainer, answers, codeOne, codeTwo);
            overallResult.relations.push({ codes: [codeOne, codeTwo], data: count });
            const svgElement = Plot.plot({
                grid: true,
                x: { label: '',  domain: questionContainer.getResponseValues(codeOne) },
                y: { label: '', domain: questionContainer.getResponseValues(codeTwo) },
                marks: [
                    Plot.frame(),
                    Plot.dot(count, { x: 'x', y: 'z', r: 'y' })
                ],
                document: virtualDom.window.document
            });
            const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
            await output.saveSvgForRelation(`${unformatCode(codeOne)}x${unformatCode(codeTwo)}.svg`, svg);
        }
    }
'x-axis tick label';
    tuples.forEach((value: Tuple[], key: string) => {
        overallResult.counts[key] = value;
    });
    output.saveText('all-results.json', JSON.stringify(overallResult, undefined, 4));
}

main();
