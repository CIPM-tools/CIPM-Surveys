import { XMLParser } from 'fast-xml-parser';
import { Question, QuestionnaireXML, ResponseCategory } from './questionnaire.js';
import { readFileContent, unformatCode } from './utility.js';
import { resolve } from 'path';
import { OtherCode } from './constants.js';
import { writeFile } from 'fs/promises';

export type QuestionTypes = 'single-choice' | 'mulitple-choice' | 'free-text' | 'matrix' | 'other-free-text';

export type QuestionEncoding = {
    parentCode?: string;
    code: string;
    type: QuestionTypes;
    responses: string[];
    statement?: string;
};

export class QuestionContainer {
    private codes: Map<string, QuestionEncoding> = new Map();

    async initialize(): Promise<void> {
        const allQuestions: Question[] = await this.parseQuestionnaire();

        for (const question of allQuestions) {
            if (Array.isArray(question.response)) { // Multiple choice
                const firstResponseCode = question.response[0]['@_varName'];
                const questionCode = firstResponseCode.substring(0, firstResponseCode.indexOf('_'));
                const allResponseCodes: string[] = [];

                for (const response of question.response) {
                    if (!response.fixed) {
                        throw new Error('Found multiple responses with free text.');
                    }

                    const unformattedResponseCode: string = response['@_varName'];
                    const subResponseValues: string[] = this.extractReponseValues(response.fixed.category);

                    if (subResponseValues.length === 1 && subResponseValues.includes('Other')) {
                        const otherCode = unformattedResponseCode.substring(0, unformattedResponseCode.length - 1) + OtherCode;
                        this.codes.set(otherCode, { code: otherCode, type: 'other-free-text', parentCode: questionCode, responses: [] });
                        continue;
                    }

                    const formattedResponseCode: string = this.formatCode(unformattedResponseCode);
                    this.codes.set(formattedResponseCode, { code: formattedResponseCode, type: 'mulitple-choice', parentCode: questionCode, responses: subResponseValues });
                    allResponseCodes.push(formattedResponseCode);
                }

                this.codes.set(questionCode, { code: questionCode, type: 'mulitple-choice', responses: allResponseCodes });
            } else {
                if (!question.response.fixed) {
                    if (question.response.free) {
                        this.codes.set(question.response['@_varName'], { code: question.response['@_varName'], type: 'free-text', responses: [] });
                    }
                    continue;
                }

                const responseValues: string[] = this.extractReponseValues(question.response.fixed.category);

                if (question.subQuestion) { // Matrix
                    const subQuestionCodes: string[] = [];
                    for (const sq of question.subQuestion) {
                        const code: string = this.formatCode(sq['@_varName']);
                        subQuestionCodes.push(code);
                        this.codes.set(code, { code, type: 'matrix', responses: responseValues, statement: sq.text });
                    }
                    this.codes.set(question.response['@_varName'], { code: question.response['@_varName'], type: 'matrix', responses: subQuestionCodes });
                } else { // Single choice
                    this.codes.set(question.response['@_varName'], { code: question.response['@_varName'], type: 'single-choice', responses: responseValues });
                }
            }
        }
    }

    private async parseQuestionnaire(): Promise<Question[]> {
        const xmlParser = new XMLParser({ ignoreAttributes: false });
        const survey: QuestionnaireXML = xmlParser.parse(await readFileContent(resolve('..', 'data', 'questionnaire.xml')));
        return survey.questionnaire.section.flatMap((section) => section.question);
    }

    private extractReponseValues(responses: ResponseCategory | ResponseCategory[]): string[] {
        if (Array.isArray(responses)) {
            return responses.map((v) => v.label);
        } else {
            return [responses.label];
        }
    }

    private formatCode(code: string): string {
        return code.replace('_', '[') + ']';
    }

    async writeCodesToTS(): Promise<void> {
        let questionCodesSourceCode: string = '// This is an automatically generated file.\n\nexport const QUESTION_CODES = {\n\n';
        for (const key of this.codes.keys()) {
            questionCodesSourceCode += `    ${unformatCode(key)}: '${key}',\n\n`;
        }
        questionCodesSourceCode += '};\n';
        await writeFile(resolve('src', 'question-codes.ts'), questionCodesSourceCode, { encoding: 'utf-8' });
    }

    getResponses(code: string): string[] {
        return this.codes.get(code)?.responses ?? [];
    }

    getResponseCodeValueMapping(code: string): Map<string, string> {
        const result: Map<string, string> = new Map();
        const responseCodes: string[] = this.getResponses(code);
        for (const code of responseCodes) {
            const question: QuestionEncoding | undefined = this.codes.get(code);
            if (question && question.responses.length > 0) {
                result.set(code, question.responses[0]);
            }
        }
        return result;
    }

    getAllCodes(): string[] {
        return [...this.codes.keys()];
    }

    getQuestionType(code: string): QuestionTypes | undefined {
        return this.codes.get(code)?.type;
    }
}
