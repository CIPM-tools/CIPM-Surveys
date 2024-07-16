import { XMLParser } from 'fast-xml-parser';
import { QuestionnaireXML, ResponseCategory, Section } from '../types/questionnaire-xml.js';
import { OtherCode } from '../types/constants.js';
import { formatCode } from './utility.js';
import { QuestionEncoding, Questions, QuestionSection } from '../types/questions.js';

export function parseQuestionnaire(content: string): Questions {
    const xmlParser = new XMLParser({ ignoreAttributes: false });
    const survey: QuestionnaireXML = xmlParser.parse(content);

    const sections: QuestionSection[] = survey.questionnaire.section.map((section) => convertSection(section));
    return { introduction: { title: survey.questionnaire.title, infoAfter: '', infoBefore: '' }, sections, conditions: [] };
}

function convertSection(section: Section): QuestionSection {
    const convertedQuestions: QuestionEncoding[] = [];

    for (const question of Array.isArray(section.question) ? section.question : [section.question]) {
        if (Array.isArray(question.response)) { // Multiple choice
            const firstResponseCode = question.response[0]['@_varName'];
            const questionCode = firstResponseCode.substring(0, firstResponseCode.indexOf('_'));
            const allResponseCodes: string[] = [];

            for (const response of question.response) {
                if (!response.fixed) {
                    throw new Error('Found multiple responses with free text.');
                }

                const unformattedResponseCode: string = response['@_varName'];
                const subResponseValues: string[] = extractReponseValues(response.fixed.category);

                if (subResponseValues.length === 1 && subResponseValues.includes('Other')) {
                    const otherCode = unformattedResponseCode.substring(0, unformattedResponseCode.length - 1) + OtherCode;
                    convertedQuestions.push({ code: otherCode, type: 'other-free-text', parentCode: questionCode, responses: [], text: '' });
                    continue;
                }

                const formattedResponseCode: string = formatCode(unformattedResponseCode);
                convertedQuestions.push({ code: formattedResponseCode, type: 'mulitple-choice', parentCode: questionCode, responses: subResponseValues, text: '' });
                allResponseCodes.push(formattedResponseCode);
            }

            convertedQuestions.push({ code: questionCode, type: 'mulitple-choice', responses: allResponseCodes, text: '' });
        } else {
            if (!question.response.fixed) {
                if (question.response.free) {
                    convertedQuestions.push({ code: question.response['@_varName'], type: 'free-text', responses: [], text: question.text });
                }
                continue;
            }

            const responseValues: string[] = extractReponseValues(question.response.fixed.category);

            if (question.subQuestion) { // Matrix
                const subQuestionCodes: string[] = [];
                for (const sq of question.subQuestion) {
                    const code: string = formatCode(sq['@_varName']);
                    subQuestionCodes.push(code);
                    convertedQuestions.push({ code, parentCode: question.response['@_varName'], type: 'matrix', responses: responseValues, statement: sq.text, text: '' });
                }
                convertedQuestions.push({ code: question.response['@_varName'], type: 'matrix', responses: subQuestionCodes, text: question.text });
            } else { // Single choice
                convertedQuestions.push({ code: question.response['@_varName'], type: 'single-choice', responses: responseValues, text: question.text });
            }
        }
    }

    return { title: section.sectionInfo.text, encodings: convertedQuestions };
}

function extractReponseValues(responses: ResponseCategory | ResponseCategory[]): string[] {
    if (Array.isArray(responses)) {
        return responses.map((v) => v.label);
    } else {
        return [responses.label];
    }
}