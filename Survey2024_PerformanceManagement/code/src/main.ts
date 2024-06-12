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
};

function countResponseOccurrences(answers: ResponseJson, { code, condition }: CodeConditionPair, responseValues: string[]): Tuple[] {
    const result: Tuple[] = responseValues.map((value) => ({ x: value, y: 0 }));
    let noAnswerCount: number = 0;
    for (const entry of answers.responses) {
        if (condition && entry[condition.code] !== condition.value) {
            continue;
        }
        if (entry[code] !== '') {
            result.filter((x) => x.x === entry[code]).forEach((x) => x.y++);
        } else {
            noAnswerCount++;
        }
    }
    if (noAnswerCount > 0) {
        result.push({ x: NoAnswer, y: noAnswerCount });
    }
    return result;
}

async function main(): Promise<void> {
    const allQuestions: Question[] = await parseQuestionnaire();
    const codeToResponses: Map<string, string[]> = new Map();
    for (const question of allQuestions) {
        if (Array.isArray(question.response)) { // Multiple choice
            const allResponseValues: string[] = [];
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
                codeToResponses.set(formatCode(unformattedResponseCode), subResponseValues);
                allResponseValues.push(...subResponseValues);
            }
            const firstResponseCode = question.response[0]['@_varName'];
            const questionCode = firstResponseCode.substring(0, firstResponseCode.indexOf('_'));
            codeToResponses.set(questionCode, allResponseValues);
        } else {
            if (!question.response.fixed) {
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
        { code: QUESTION_CODES.D5CompanySize },
        { code: QUESTION_CODES.D6TeamSize },
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
        { code: QUESTION_CODES.Co2DevTimeLearn, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co2PMTimeLearn, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { code: QUESTION_CODES.Co3DevTimeAdoption, condition: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { code: QUESTION_CODES.Co3PMTimeAdoption, condition: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } }
    ];
    for (const coco of codesForDescriptiveStatistics) {
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
        await writeFile(`${unformatCode(coco.code)}${coco.condition ? '-' + coco.condition.code + '-' + coco.condition.value : ''}.svg`, svg, { encoding: 'utf-8' });
    }
}

main();
