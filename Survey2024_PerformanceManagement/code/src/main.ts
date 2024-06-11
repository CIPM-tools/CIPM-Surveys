import { XMLParser } from 'fast-xml-parser';
import { parse } from 'csv-parse/sync';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Question, QuestionnaireXML, ResponseCategory } from './questionnaire';
import { QUESTION_CODES } from './question-codes';

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

async function parseAnswers(): Promise<string[][]> {
    return parse(await readFileContent(resolve('..', 'results.csv')), { bom: true });
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
                if (subResponseValues.length === 1 && subResponseValues.includes('Other')) {
                    const otherCode = unformattedResponseCode.substring(0, unformattedResponseCode.length - 1) + '[Other]';
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
    //     questionCodesSourceCode += `    ${key.replace('[', '').replace(']', '')}: '${key}',\n\n`;
    // }
    // questionCodesSourceCode += '};\n';
    // await writeFile(resolve('src', 'question-codes.ts'), questionCodesSourceCode, { encoding: 'utf-8' });
    
    const answers: string[][] = await parseAnswers(); // [row][column]
}

main();
