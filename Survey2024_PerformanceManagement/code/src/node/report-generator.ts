import { resolve } from 'path';
import { QuestionContainer } from '../common/logic/question-container.js';
import { SimpleCondition } from '../common/types/condition.js';
import { OtherCode } from '../common/types/constants.js';
import { Questions, QuestionTypes } from '../common/types/questions.js';
import { convertLongCodeToShortCode } from '../common/ui/plots-common.js';
import { writeFileContent } from './fs-utility.js';

export async function generateQuestionnaireMarkdown(outputDirectory: string, questions: Questions, questionContainer: QuestionContainer): Promise<void> {
    let md: string = `# ${questions.introduction.title}\n\n${questions.introduction.infoBefore}\n\n`;
    questions.sections.forEach((section) => {
        md += `## Section: *${section.title}*\n\n`;
        if (section.infoBefore) {
            md += `${section.infoBefore}\n\n`;
        }
        section.encodings.forEach((encoding) => {
            if (encoding.parentCode) {
                return;
            }
            md += `### ${encoding.text} [${encoding.code}]\n\n`;
            if (encoding.supportingText) {
                md += `${encoding.supportingText}\n\n`;
            }
            const applyingConditions: SimpleCondition[] = questions.conditions.filter((condition) => condition.conditionedCode === encoding.code);
            if (applyingConditions.length > 0) {
                applyingConditions.forEach((condition) => {
                    md += `(Only shown if ${convertLongCodeToShortCode(condition.required.code)} equals ${condition.required.value}.)\n\n`;
                });
            }
            md += `(${convertQuestionType(encoding.type)})\n\n`;
            const responses: string[] = questionContainer.getResponseValues(encoding.code);
            if (encoding.type === 'single-choice') {
                if (responses.length > 15) {
                    md += `[${responses.length} responses omitted]\n\n`;
                } else {
                    md += responses.map((r) => `* ${r}`).join('\n') + '\n\n';
                }
            } else if (encoding.type === 'mulitple-choice') {
                md += responses.map((r, index) => `* ${r} [${convertLongCodeToShortCode(encoding.responses[index])}]`).join('\n') + '\n';
                const otherTypeCode = `${encoding.code}${OtherCode}`;
                console.log(questionContainer.getQuestionType(otherTypeCode), otherTypeCode);
                if (questionContainer.getQuestionType(otherTypeCode) === 'other-free-text') {
                    md += `* Other (Free text)\n`;
                }
                md += '\n';
            } else if (encoding.type === 'matrix') {
                const statements: { statement: string; code: string }[] = encoding.
                    responses.
                    flatMap((code) => section.encodings.filter((e) => e.code === code))
                    .map((e) => ({ statement: e.statement ?? '', code: e.code }));
                md += `Statements\n${statements.map((s) => `1. ${s.statement} [${convertLongCodeToShortCode(s.code)}]`).join('\n')}\n\n`;
                md += `Scale\n* ${questionContainer.getResponses(encoding.responses[0]).join('\n* ')}\n\n`;
            }
        });
    });
    if (questions.introduction.infoAfter) {
        md += `## Closing\n\n${questions.introduction.infoAfter}\n`;
    }
    return writeFileContent(resolve(outputDirectory, 'questionnaire.md'), md);
}

function convertQuestionType(type: QuestionTypes): string {
    switch(type) {
        case 'free-text':
            return 'Free text';
        case 'matrix':
            return 'Matrix';
        case 'mulitple-choice':
            return 'Multiple choice';
        case 'single-choice':
            return 'Single choice';
        default:
            throw new Error(`Unknown question type '${type}'.`);
    }
}
