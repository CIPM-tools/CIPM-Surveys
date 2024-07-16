import { Questions } from '../types/questions.js';
import { unformatCode } from './utility';

export function convertCodesToTypeScript(question: Questions): string {
    let questionCodesSourceCode: string = '// This is an automatically generated file.\n\nexport const QUESTION_CODES = {\n\n';
    for (const encoding of question.sections.flatMap((section) => section.encodings)) {
        questionCodesSourceCode += `    ${unformatCode(encoding.code)}: '${encoding.code}',\n\n`;
    }
    questionCodesSourceCode += '};\n';
    return questionCodesSourceCode;
}
