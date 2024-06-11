import { XMLParser } from 'fast-xml-parser';
import { parse } from 'csv-parse/sync';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Question, QuestionnaireXML } from './questionnaire';

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

async function main(): Promise<void> {
    const allQuestions: Question[] = await parseQuestionnaire();
    const answers: string[][] = await parseAnswers(); // [row][column]
}

main();
