import { resolve } from 'path';
import { Question, QuestionnaireXML, ResponseCategory } from './questionnaire.js';
import { QUESTION_CODES } from './question-codes.js';
import * as Plot from '@observablehq/plot';
import { JSDOM } from 'jsdom';
import { ResponseJson } from './responses.js';
import { Output } from './output.js';
import { readFileContent, unformatCode } from './utility.js';
import { OtherCode } from './constants.js';
import { QuestionContainer } from './question-container.js';

const NoAnswer: string = 'No Answer';
const Yes: string = 'Yes';
const No: string = 'No';

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
    isMultipleChoice?: boolean,
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
    if (noAnswerCount > 0) {
        result.push({ x: NoAnswer, y: noAnswerCount });
    }
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

async function main(): Promise<void> {
    const questionContainer: QuestionContainer = new QuestionContainer();
    await questionContainer.initialize();
    await questionContainer.writeCodesToTS();
    
    const answers: ResponseJson = await parseAnswers();
    // answers.responses = answers.responses.filter((r) => r['lastpage']! === 29);
    let completed = 0;
    let incomplete = 0;
    let neverStarted = 0;
    for (const r of answers.responses) {
        const lp = r['lastpage'];
        if (lp === null || (typeof lp === 'number' && lp <= 0)) {
            neverStarted++;
        } else if (lp === 29) {
            completed++;
        } else {
            incomplete++;
        }
    }
    console.log(completed, incomplete, neverStarted);

    const virtualDom = new JSDOM();
    const output: Output = new Output(resolve('..', 'output'));

    const codesForDescriptiveStatistics: CodeConditionPair[] = [
        { code: QUESTION_CODES.D2Age },
        { code: QUESTION_CODES.D3Experience },
        { code: QUESTION_CODES.D4Roles, isMultipleChoice: true },
        { code: QUESTION_CODES.D5CompanySize },
        { code: QUESTION_CODES.D6TeamSize },
        { code: QUESTION_CODES.C1DevMethod, isMultipleChoice: true },
        { code: QUESTION_CODES.C2Technologies, isMultipleChoice: true },
        { code: QUESTION_CODES.C3PManagement, isMultipleChoice: true },
        { code: QUESTION_CODES.C4MonHinder, isMultipleChoice: true, condition: { code: QUESTION_CODES.C3PManagementC3Mon, value: No } },
        { code: QUESTION_CODES.C4MonTools, isMultipleChoice: true, condition: { code: QUESTION_CODES.C3PManagementC3Mon, value: Yes } },
        { code: QUESTION_CODES.C5TestsHinder, isMultipleChoice: true, condition: { code: QUESTION_CODES.C3PManagementC3Tests, value: No } },
        { code: QUESTION_CODES.C6PredictionHinder, isMultipleChoice: true, condition: { code: QUESTION_CODES.C3PManagementC3Prediction, value: No } },
        { code: QUESTION_CODES.C6PredictionTools, isMultipleChoice: true, condition: { code: QUESTION_CODES.C3PManagementC3Prediction, value: Yes } },
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
        { code: QUESTION_CODES.Co1DevFactors, isMultipleChoice: true, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co1PMFactors, isMultipleChoice: true, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { code: QUESTION_CODES.Co2DevTimeLearn, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co2PMTimeLearn, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { code: QUESTION_CODES.Co3DevTimeAdoption, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co3PMTimeAdoption, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } }
    ];
    const tuples: Map<string, Tuple[]> = new Map();
    for (const coco of codesForDescriptiveStatistics) {
        if (coco.isMultipleChoice) {
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

    const combinedCodes: string[] = [QUESTION_CODES.C9GeneralTrustSQ001, QUESTION_CODES.C9GeneralTrustSQ002, QUESTION_CODES.C9GeneralTrustSQ003];
    const svgElement = Plot.plot({
        grid: true,
        x: { label: '', axis: 'top' },
        fx: { label: '', axis: 'bottom', domain: questionContainer.getResponses(combinedCodes[0]) },
        y: { label: '' },
        color: { scheme: 'Category10' },
        marks: [
            Plot.frame(),
            Plot.barY(combinedCodes.flatMap((code) => tuples.get(code)?.map((v) => ({ x: v.x, y: v.y, z: code } as Triple)) ?? []), Plot.groupX({ y: 'identity' }, { x: 'z', y: 'y', fx: 'x', fill: 'z' })),
        ],
        document: virtualDom.window.document
    });
    const svg: string = svgElement instanceof virtualDom.window.SVGElement ? svgElement.outerHTML : svgElement.innerHTML;
    await output.saveSvgForDescriptiveStatistic(`${combinedCodes.join('-')}.svg`, svg);

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
            const svgElement = Plot.plot({
                grid: true,
                x: { label: '' },
                y: { label: '' },
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
}

main();
