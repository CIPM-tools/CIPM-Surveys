import { existsSync } from 'fs';
import { resolve } from 'path';
import { convertCodesToTypeScript } from '../common/logic/code-to-code.js';
import { parseQuestionnaire } from '../common/logic/questionnaire-parser.js';
import { anonymize } from '../common/logic/utility.js';
import { No, Yes } from '../common/types/constants.js';
import { Questions } from '../common/types/questions.js';
import { ResponseJson } from '../common/types/responses.js';
import { readFileContent, writeFileContent } from './fs-utility.js';
import { QUESTION_CODES } from './question-codes.js';

export async function main(): Promise<void> {
    const dataDirectory: string = resolve('..', 'data');

    const questionnaireContent: string = await readFileContent(resolve(dataDirectory, 'questionnaire.xml'))
    const questionnaire: Questions = parseQuestionnaire(questionnaireContent);
    questionnaire.conditions = [
        { conditionedCode: QUESTION_CODES.C4MonHinder, required: { code: QUESTION_CODES.C3PManagementC3Mon, value: No } },
        { conditionedCode: QUESTION_CODES.C4MonTools, required: { code: QUESTION_CODES.C3PManagementC3Mon, value: Yes } },
        { conditionedCode: QUESTION_CODES.C5TestsHinder, required: { code: QUESTION_CODES.C3PManagementC3Tests, value: No } },
        { conditionedCode: QUESTION_CODES.C6PredictionHinder, required: { code: QUESTION_CODES.C3PManagementC3Prediction, value: No } },
        { conditionedCode: QUESTION_CODES.C6PredictionTools, required: { code: QUESTION_CODES.C3PManagementC3Prediction, value: Yes } },
        { conditionedCode: QUESTION_CODES.Co1DevFactors, required: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { conditionedCode: QUESTION_CODES.Co1PMFactors, required: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { conditionedCode: QUESTION_CODES.Co2DevTimeLearn, required: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { conditionedCode: QUESTION_CODES.Co2PMTimeLearn, required: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } },
        { conditionedCode: QUESTION_CODES.Co3DevTimeAdoption, required: { code: QUESTION_CODES.D4RolesSQ003, value: No } },
        { conditionedCode: QUESTION_CODES.Co3PMTimeAdoption, required: { code: QUESTION_CODES.D4RolesSQ003, value: Yes } }
    ];
    await writeFileContent(resolve(dataDirectory, 'questions.json'), JSON.stringify(questionnaire, undefined, 4));
    // The generated code is already contained within the repository.
    // await writeFileContent(resolve('src', 'node', 'question-codes.ts'), convertCodesToTypeScript(questionnaire));

    const originalResponseFile: string = resolve('..', 'actual_responses.json');
    const anonymizedResponseFile: string = resolve(dataDirectory, 'responses-anonymized.json');
    const { originalExists, anonymizedExists } = { originalExists: existsSync(originalResponseFile), anonymizedExists: existsSync(anonymizedResponseFile) };
    if (!originalExists && !anonymizedExists) {
        throw new Error('There is no response file.');
    }
    const answers: ResponseJson = JSON.parse(await readFileContent(originalExists ? originalResponseFile : anonymizedResponseFile));
    // The anonymized answers are already contained in the repository.
    // await writeFileContent(
    //     anonymizedResponseFile,
    //     JSON.stringify(
    //         anonymize(answers, [
    //             QUESTION_CODES.D1Country, QUESTION_CODES.D2Age, QUESTION_CODES.D3Experience, QUESTION_CODES.D5CompanySize, QUESTION_CODES.D6TeamSize
    //         ]), undefined, 4)
    // );

    
}

main();
