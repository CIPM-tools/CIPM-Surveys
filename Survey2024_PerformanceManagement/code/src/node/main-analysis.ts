import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import lodash from 'lodash';
import { resolve } from 'path';
import { convertCodesToTypeScript } from '../common/logic/code-to-code.js';
import { QuestionContainer } from '../common/logic/question-container.js';
import { parseQuestionnaire } from '../common/logic/questionnaire-parser.js';
import { ResponseCounter } from '../common/logic/response-counter.js';
import { anonymize } from '../common/logic/utility.js';
import { AnalysisResult } from '../common/types/analysis-result.js';
import { No, OtherCode, Yes } from '../common/types/constants.js';
import { Questions } from '../common/types/questions.js';
import { ResponseCount, SingleResponseCount } from '../common/types/response-count.js';
import { ResponseJson } from '../common/types/responses.js';
import { generateSinglePlot } from '../common/ui/plots-single.js';
import { readFileContent, writeFileContent } from './fs-utility.js';
import { QUESTION_CODES } from './question-codes.js';
import { JSDOM } from 'jsdom';
import { generateCombinedPlot } from '../common/ui/plots-combined.js';
import { generateMatrixPlots } from '../common/ui/plots-matrix.js';
import { generateRelationPlot } from '../common/ui/plots-relations.js';
import { generateQuestionnaireMarkdown } from './report-generator.js';

main();

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
    const questionCodeFile: string = resolve('src', 'node', 'question-codes.ts');
    if (!existsSync(questionCodeFile)) {
        await writeFileContent(resolve('src', 'node', 'question-codes.ts'), convertCodesToTypeScript(questionnaire));
    }

    const questionContainer: QuestionContainer = new QuestionContainer(questionnaire);
    await generateQuestionnaireMarkdown(dataDirectory, questionnaire, questionContainer);

    const originalResponseFile: string = resolve('..', 'actual_responses.json');
    const anonymizedResponseFile: string = resolve(dataDirectory, 'responses-anonymized.json');
    const { originalExists, anonymizedExists } = { originalExists: existsSync(originalResponseFile), anonymizedExists: existsSync(anonymizedResponseFile) };
    if (!originalExists && !anonymizedExists) {
        throw new Error('There is no response file.');
    }
    const answers: ResponseJson = JSON.parse(await readFileContent(originalExists ? originalResponseFile : anonymizedResponseFile));
    if (!existsSync(anonymizedResponseFile)) {
        await writeFileContent(
            anonymizedResponseFile,
            JSON.stringify(
                anonymize(answers, [
                    QUESTION_CODES.D1Country, QUESTION_CODES.D2Age, QUESTION_CODES.D3Experience, QUESTION_CODES.D5CompanySize, QUESTION_CODES.D6TeamSize
                ]), undefined, 4)
        );
    }

    const outputDirectory: string = resolve(dataDirectory, `results-${Date.now()}`);
    await analyzeAnswers(questionContainer, answers, resolve(outputDirectory, 'results-unfiltered'));
    answers.responses = answers.responses.filter((r) => r['lastpage']! === 29);
    await analyzeAnswers(questionContainer, answers, resolve(outputDirectory, 'results-complete-only'));
}

async function analyzeAnswers(questionContainer: QuestionContainer, answers: ResponseJson, outputDirectory: string): Promise<void> {
    await mkdir(outputDirectory, { recursive: true });
    const graphicsSingleDirectory: string = resolve(outputDirectory, 'graphs-sinlge');
    await mkdir(graphicsSingleDirectory);
    const graphicsCombinedDirectory: string = resolve(outputDirectory, 'graphs-combined');
    await mkdir(graphicsCombinedDirectory);
    const graphicsRelatedDirectory: string = resolve(outputDirectory, 'graphs-related');
    await mkdir(graphicsRelatedDirectory);

    const overallResult: AnalysisResult = {
        relations: [],
        texts: {},
        responseNumbers: {
            completed: 0,
            incomplete: 0,
            neverStarted: 0
        }
    };
    
    for (const response of answers.responses) {
        const lastPage: string | number | null = response['lastpage'];
        if (lastPage === null || (typeof lastPage === 'number' && lastPage <= 0)) {
            overallResult.responseNumbers.neverStarted++;
        } else if (lastPage === 29) {
            overallResult.responseNumbers.completed++;
        } else {
            overallResult.responseNumbers.incomplete++;
        }
    }

    const virtualDom = new JSDOM();
    const responseCounter: ResponseCounter = new ResponseCounter();
    
    const codesForDescriptiveStatistics: string[] = [
        QUESTION_CODES.D1Country,
        QUESTION_CODES.D2Age,
        QUESTION_CODES.D3Experience,
        QUESTION_CODES.D4Roles,
        QUESTION_CODES.D5CompanySize,
        QUESTION_CODES.D6TeamSize,
        QUESTION_CODES.C1DevMethod,
        QUESTION_CODES.C2Technologies,
        QUESTION_CODES.C3PManagement,
        QUESTION_CODES.C4MonHinder,
        QUESTION_CODES.C4MonTools,
        QUESTION_CODES.C5TestsHinder,
        QUESTION_CODES.C6PredictionHinder,
        QUESTION_CODES.C6PredictionTools,
        QUESTION_CODES.C7Purpose,
        QUESTION_CODES.C8RelevanceSQ001,
        QUESTION_CODES.C8RelevanceSQ002,
        QUESTION_CODES.C9GeneralTrustSQ001,
        QUESTION_CODES.C9GeneralTrustSQ002,
        QUESTION_CODES.C9GeneralTrustSQ003,
        QUESTION_CODES.Ch1QualitySQ001,
        QUESTION_CODES.Ch1QualitySQ002,
        QUESTION_CODES.Ch1QualitySQ003,
        QUESTION_CODES.Ch1QualitySQ004,
        QUESTION_CODES.Ch1QualitySQ005,
        QUESTION_CODES.Ch4PredictionFeatureSQ001,
        QUESTION_CODES.Ch4PredictionFeatureSQ002,
        QUESTION_CODES.Ch4PredictionFeatureSQ003,
        QUESTION_CODES.Ch4PredictionFeatureSQ004,
        QUESTION_CODES.Ch4PredictionFeatureSQ005,
        QUESTION_CODES.N2TrustSQ001,
        QUESTION_CODES.N2TrustSQ002,
        QUESTION_CODES.N2TrustSQ003,
        QUESTION_CODES.Co1DevFactors,
        QUESTION_CODES.Co1PMFactors,
        QUESTION_CODES.Co2DevTimeLearn,
        QUESTION_CODES.Co2PMTimeLearn,
        QUESTION_CODES.Co3DevTimeAdoption,
        QUESTION_CODES.Co3PMTimeAdoption
    ];
    const allSingleResponseCounts: ResponseCount[] = responseCounter.countResponsesForCodes(questionContainer, answers, codesForDescriptiveStatistics, { countRelativeFrequency: true });
    for (const count of allSingleResponseCounts) {
        overallResult.relations.push(count);
        await writeFileContent(resolve(graphicsSingleDirectory, count.questionCodes[0] + '.html'), generateSinglePlot(count, virtualDom));
    }

    const combinedCodes: string[][] = [
        [QUESTION_CODES.C9GeneralTrustSQ001, QUESTION_CODES.C9GeneralTrustSQ002, QUESTION_CODES.C9GeneralTrustSQ003],
        [QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C9GeneralTrustSQ003, QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C9GeneralTrustSQ001, QUESTION_CODES.C9GeneralTrustSQ002, QUESTION_CODES.C9GeneralTrustSQ003, QUESTION_CODES.N2TrustSQ001, QUESTION_CODES.N2TrustSQ002, QUESTION_CODES.N2TrustSQ003],
        [QUESTION_CODES.C8RelevanceSQ001, QUESTION_CODES.C8RelevanceSQ002],
        [QUESTION_CODES.Co2DevTimeLearn, QUESTION_CODES.Co2PMTimeLearn],
        [QUESTION_CODES.Co3DevTimeAdoption, QUESTION_CODES.Co3PMTimeAdoption],
        [QUESTION_CODES.C4MonHinder, QUESTION_CODES.C5TestsHinder, QUESTION_CODES.C6PredictionHinder],
        [QUESTION_CODES.Ch1QualitySQ001, QUESTION_CODES.Ch1QualitySQ002, QUESTION_CODES.Ch1QualitySQ003, QUESTION_CODES.Ch1QualitySQ004, QUESTION_CODES.Ch1QualitySQ005],
        [QUESTION_CODES.Ch4PredictionFeatureSQ001, QUESTION_CODES.Ch4PredictionFeatureSQ002, QUESTION_CODES.Ch4PredictionFeatureSQ003, QUESTION_CODES.Ch4PredictionFeatureSQ004, QUESTION_CODES.Ch4PredictionFeatureSQ005]
    ];

    for (const combination of combinedCodes) {
        const combiningCounts: ResponseCount[] = allSingleResponseCounts.filter((count: ResponseCount) => {
            return combination.map((code) => count.questionCodes.includes(code)).some((included) => included === true);
        });
        const combinedData: SingleResponseCount[] = combiningCounts.flatMap((count) => {
            const countsWithQuestionCode = lodash.cloneDeep(count.counts);
            countsWithQuestionCode.forEach((value) => {
                value.codes.push(...count.questionCodes);
                value.relativeFrequency = undefined;
            });
            return countsWithQuestionCode;
        });
        const combinedResponseCount: ResponseCount = { questionCodes: combination, counts: combinedData, stats: [] };
        overallResult.relations.push(combinedResponseCount);

        await writeFileContent(resolve(graphicsCombinedDirectory, combination.join('-') + '-choices.html'), generateCombinedPlot(combinedResponseCount, questionContainer, virtualDom));
        if (questionContainer.getQuestionType(combination[0]) === 'matrix') {
            const { absolute, relative, box } = generateMatrixPlots(combinedResponseCount, questionContainer, answers, virtualDom);
            await writeFileContent(resolve(graphicsCombinedDirectory, combination.join('-') + '-abs.html'), absolute);
            await writeFileContent(resolve(graphicsCombinedDirectory, combination.join('-') + '-rel.html'), relative);
            await writeFileContent(resolve(graphicsCombinedDirectory, combination.join('-') + '-box.html'), box);
        }
    }

    const valuesLearn = questionContainer.getResponseValues(QUESTION_CODES.Co2DevTimeLearn);
    const valuesAdoption = questionContainer.getResponseValues(QUESTION_CODES.Co3DevTimeAdoption);
    const newValues = ['Less than 1 week', '1-2 weeks', 'More than 2 weeks'];
    const oldValuesToNewIndices: Map<string, number> = new Map();
    oldValuesToNewIndices.set(valuesLearn[0], 0);
    oldValuesToNewIndices.set(valuesLearn[1], 0);
    oldValuesToNewIndices.set(valuesLearn[2], 0);
    oldValuesToNewIndices.set(valuesLearn[3], 0);
    oldValuesToNewIndices.set(valuesLearn[4], 1);
    oldValuesToNewIndices.set(valuesLearn[5], 2);
    oldValuesToNewIndices.set(valuesAdoption[0], 0);
    oldValuesToNewIndices.set(valuesAdoption[1], 1);
    oldValuesToNewIndices.set(valuesAdoption[2], 2);
    oldValuesToNewIndices.set(valuesAdoption[3], 2);
    oldValuesToNewIndices.set(valuesAdoption[4], 2);

    const codesToMap = [QUESTION_CODES.Co2DevTimeLearn, QUESTION_CODES.Co2PMTimeLearn, QUESTION_CODES.Co3DevTimeAdoption, QUESTION_CODES.Co3PMTimeAdoption];
    const mappedData: SingleResponseCount[] = [];
    for (const code of codesToMap) {
        const temporaryMappedData: SingleResponseCount[] = newValues.map((v) => ({ codes: [v, code], count: 0 }));
        const filteredCounts: SingleResponseCount[] = allSingleResponseCounts.filter((c) => c.questionCodes.includes(code)).flatMap((c) => c.counts);
        for (const counts of filteredCounts) {
            temporaryMappedData[oldValuesToNewIndices.get(counts.codes[0]) ?? 0].count += counts.count;
        }
        mappedData.push(...temporaryMappedData);
    }
    const mappedResponseCount = { questionCodes: codesToMap, counts: mappedData, stats: [] };
    overallResult.relations.push(mappedResponseCount);
    await writeFileContent(resolve(graphicsCombinedDirectory, codesToMap.join('-') + '-choices.html'), generateCombinedPlot(mappedResponseCount, questionContainer, virtualDom));

    overallResult.texts[QUESTION_CODES.Ch2Challenges] = getTexts(answers, QUESTION_CODES.Ch2Challenges);
    overallResult.texts[QUESTION_CODES.Ch3MissingFeatures] = getTexts(answers, QUESTION_CODES.Ch3MissingFeatures);
    for (const code of questionContainer.getAllCodes()) {
        if (code.endsWith(OtherCode)) {
            overallResult.texts[code] = getTexts(answers, code);
        }
    }

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
    const relatedReponseCounts: ResponseCount[] = responseCounter.countRelatedResponsesForCodes(questionContainer, answers, [codesOneDimension, codesOtherDimension]);
    for (const count of relatedReponseCounts) {
        overallResult.relations.push(count);
        await writeFileContent(resolve(graphicsRelatedDirectory, count.questionCodes.join('x') + '.html'), generateRelationPlot(count, questionContainer, virtualDom));
    }

    return writeFileContent(resolve(outputDirectory, 'all-results.json'), JSON.stringify(overallResult, undefined, 4));
}

function getTexts(answers: ResponseJson, code: string): string[] {
    return answers.responses.map((entry) => entry[code]).filter((entry) => typeof entry === 'string' && entry !== '').map((entry) => entry as string);
}
