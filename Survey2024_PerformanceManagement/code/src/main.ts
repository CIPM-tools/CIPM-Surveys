import { XMLParser } from 'fast-xml-parser';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Question, QuestionnaireXML, ResponseCategory } from './questionnaire.js';
import { QUESTION_CODES } from './question-codes.js';
import * as Plot from '@observablehq/plot';
import { JSDOM } from 'jsdom';
import { ResponseJson } from './responses.js';

const Other: string = 'Other';
const OtherCode: string = `[${Other}]`;
const NoAnswer: string = 'No Answer';
const Yes: string = 'Yes';
const No: string = 'No';

function readFileContent(path: string): Promise<string> {
    if (!existsSync(path)) {
        throw new Error(`The file '${path}' does not exist.`);
    }
    return readFile(path, { encoding: 'utf-8' });
}

async function parseQuestionnaire(): Promise<Question[]> {
    const xmlParser = new XMLParser({ ignoreAttributes: false });
    const survey: QuestionnaireXML = xmlParser.parse(await readFileContent(resolve('..', 'data', 'questionnaire.xml')));
    return survey.questionnaire.section.flatMap((section) => section.question);
}

async function parseAnswers(): Promise<ResponseJson> {
    return JSON.parse(await readFileContent(resolve('..', 'results.json')));
}

function extractReponseValues(responses: ResponseCategory | ResponseCategory[]): string[] {
    if (Array.isArray(responses)) {
        return responses.map((v) => v.label);
    } else {
        return [responses.label];
    }
}

function formatCode(code: string): string {
    return code.replace('_', '[') + ']';
}

function unformatCode(code: string): string {
    return code.replace('[', '').replace(']', '');
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

function getResponseCodeMapping(responseCodes: string[], codeToResponses: Map<string, string[]>): Map<string, string> {
    const result: Map<string, string> = new Map();
    for (const code of responseCodes) {
        const responses: string[] | undefined = codeToResponses.get(code);
        if (responses && responses.length > 0) {
            result.set(code, responses[0]);
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

function createConditions(codeToResponses: Map<string, string[]>, code: string): LabeledCondition[] {
    const responses: string[] | undefined = codeToResponses.get(code);
    if (!responses) {
        throw new Error(`Illegal code '${code}'. No responses found.`);
    }
    if (codeToResponses.get(responses[0]) !== undefined) {
        return responses.map((responseCode) => ({ code: responseCode, value: Yes, label: codeToResponses.get(responseCode)?.[0] ?? '' }));
    } else {
        return responses.map((responseValue) => ({ code: code, value: responseValue, label: responseValue }));
    }
}

function createRelation(codeToResponses: Map<string, string[]>, codeOne: string, codeTwo: string): CodeRelation[] {
    const conditionsOne: LabeledCondition[] = createConditions(codeToResponses, codeOne);
    const conidtionsTwo: LabeledCondition[] = createConditions(codeToResponses, codeTwo);
    const result: CodeRelation[] = [];
    for (const c1 of conditionsOne) {
        for (const c2 of conidtionsTwo) {
            result.push({ first: c1, second: c2 });
        }
    }
    return result;
}

function countRelationOccurrences(codeToResponses: Map<string, string[]>, answers: ResponseJson, codeOne: string, codeTwo: string): Triple[] {
    const relations: CodeRelation[] = createRelation(codeToResponses, codeOne, codeTwo);
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
    const allQuestions: Question[] = await parseQuestionnaire();
    const codeToResponses: Map<string, string[]> = new Map();
    for (const question of allQuestions) {
        if (Array.isArray(question.response)) { // Multiple choice
            const allResponseCodes: string[] = [];
            for (const response of question.response) {
                if (!response.fixed) {
                    throw new Error('Found multiple responses with free text.');
                }
                const unformattedResponseCode: string = response['@_varName'];
                const subResponseValues: string[] = extractReponseValues(response.fixed.category);
                if (subResponseValues.length === 1 && subResponseValues.includes(Other)) {
                    const otherCode = unformattedResponseCode.substring(0, unformattedResponseCode.length - 1) + OtherCode;
                    codeToResponses.set(otherCode, subResponseValues);
                    continue;
                }
                const formattedResponseCode: string = formatCode(unformattedResponseCode);
                codeToResponses.set(formattedResponseCode, subResponseValues);
                allResponseCodes.push(formattedResponseCode);
            }
            const firstResponseCode = question.response[0]['@_varName'];
            const questionCode = firstResponseCode.substring(0, firstResponseCode.indexOf('_'));
            codeToResponses.set(questionCode, allResponseCodes);
        } else {
            if (!question.response.fixed) {
                if (question.response.free) {
                    codeToResponses.set(question.response['@_varName'], []);
                }
                continue;
            }
            const responseValues: string[] = extractReponseValues(question.response.fixed.category);
            if (question.subQuestion) { // Matrix
                for (const sq of question.subQuestion) {
                    codeToResponses.set(formatCode(sq['@_varName']), responseValues);
                }
            } else { // Single choice
                codeToResponses.set(question.response['@_varName'], responseValues);
            }
        }
    }

    // let questionCodesSourceCode: string = '// This is an automatically generated file.\n\nexport const QUESTION_CODES = {\n\n';
    // for (const key of codeToResponses.keys()) {
    //     questionCodesSourceCode += `    ${unformatCode(key)}: '${key}',\n\n`;
    // }
    // questionCodesSourceCode += '};\n';
    // await writeFile(resolve('src', 'question-codes.ts'), questionCodesSourceCode, { encoding: 'utf-8' });
    
    const answers: ResponseJson = await parseAnswers();

    const virtualDom = new JSDOM();

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
    for (const coco of codesForDescriptiveStatistics) {
        if (coco.isMultipleChoice) {
            coco.responseValueMapping = getResponseCodeMapping(codeToResponses.get(coco.code) ?? [], codeToResponses);
        }
        const responseCount: Tuple[] = countResponseOccurrences(answers, coco, codeToResponses.get(coco.code) ?? []);
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
        await writeFile(resolve('..', 'output', `${unformatCode(coco.code)}${coco.condition ? '-' + coco.condition.code + '-' + coco.condition.value : ''}.svg`), svg, { encoding: 'utf-8' });
    }

    const texts: { [key: string]: string[] } = {};
    texts[QUESTION_CODES.Ch2Challenges] = getTexts(answers, QUESTION_CODES.Ch2Challenges);
    texts[QUESTION_CODES.Ch3MissingFeatures] = getTexts(answers, QUESTION_CODES.Ch3MissingFeatures);
    for (const code of codeToResponses.keys()) {
        if (code.endsWith(OtherCode)) {
            texts[code] = getTexts(answers, code);
        }
    }
    await writeFile(resolve('..', 'output', 'texts.json'), JSON.stringify(texts, undefined, 4), { encoding: 'utf-8' });

    const codesOneDimension: string[] = [
        QUESTION_CODES.D5CompanySize,
        QUESTION_CODES.D6TeamSize
    ];
    const codesOtherDimension: string[] = [
        QUESTION_CODES.C3PManagement
    ];
    for (const codeOne of codesOneDimension) {
        for (const codeTwo of codesOtherDimension) {
            const count: Triple[] = countRelationOccurrences(codeToResponses, answers, codeOne, codeTwo);
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
            await writeFile(resolve('..', 'output', `${unformatCode(codeOne)}x${unformatCode(codeTwo)}.svg`), svg, { encoding: 'utf-8' });
        }
    }
}

main();
