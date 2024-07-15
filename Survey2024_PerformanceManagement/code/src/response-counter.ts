import { ResponseCount, SingleResponseCount } from './response-count.js';
import { QuestionContainer } from './question-container.js';
import { NoAnswer, Yes } from './constants.js';
import { ResponseEntry, ResponseJson } from './responses.js';
import { RequiredValue } from './condition.js';
import { checkConditions, checkRequiredValue } from './condition-evaluator.js';

export type CountConfiguration = {
    countNoAnswers?: boolean;
    countRelativeFrequency?: boolean;
    limitResponsesBy?: number;
};

type LabeledRequiredValue = RequiredValue & { label: string; };

export class ResponseCounter {
    countResponsesForCodes(questionContainer: QuestionContainer, answers: ResponseJson, codes: string[], config: CountConfiguration = { countNoAnswers: false, countRelativeFrequency: true, limitResponsesBy: 15 }): ResponseCount[] {
        return codes.map((c) => this.countResponses(questionContainer, answers, c, config));
    }

    countResponses(questionContainer: QuestionContainer, answers: ResponseJson, code: string, config: CountConfiguration): ResponseCount {
        const questionType = questionContainer.getQuestionType(code);
        if (!questionType) {
            throw new Error(`No question type found for question ${code}`);
        }

        const responseValueMapping: Map<string, string> | undefined = questionType === 'mulitple-choice' ? questionContainer.getResponseCodeValueMapping(code) : undefined;
        const singleResults: SingleResponseCount[] =
            (questionType === 'mulitple-choice' ? questionContainer.getResponses(code) : questionContainer.getResponseValues(code))
                .map((value) => ({ codes: [value], count: 0 }));
        let noAnswerCount: number = 0;

        for (const entry of answers.responses) {
            if (!checkConditions(code, questionContainer, entry)) {
                continue;
            }
            if (responseValueMapping) {
                for (const singleCount of singleResults) {
                    if (entry[singleCount.codes[0]] === Yes) {
                        singleCount.count++;
                    }
                }
            } else if (entry[code] !== '') {
                singleResults.filter((value) => value.codes[0] === entry[code]).forEach((value) => value.count++);
            } else {
                noAnswerCount++;
            }
        }

        if (config.countNoAnswers && noAnswerCount > 0) {
            singleResults.push({ codes: [NoAnswer], count: noAnswerCount });
        }
        if (responseValueMapping) {
            for (const result of singleResults) {
                result.codes[0] = responseValueMapping.get(result.codes[0]) ?? result.codes[0];
            }
        }
        if (config.countRelativeFrequency) {
            const overallCount: number = singleResults.reduce((previousValue: number, currentValue: SingleResponseCount) => previousValue + currentValue.count, 0);
            singleResults.forEach((value) => {
                value.relativeFrequency = value.count / overallCount;
            });
        }

        return { questionCodes: [code], counts: config.limitResponsesBy && singleResults.length >= config.limitResponsesBy ? singleResults.filter((value) => value.count !== 0) : singleResults, stats: [] };
    }

    countRelatedResponsesForCodes(questionContainer: QuestionContainer, answers: ResponseJson, codeDimensions: string[][]): ResponseCount[] {
        const result: ResponseCount[] = [];
        this.recursivelyCountRelatedResponsesForCode(questionContainer, answers, codeDimensions, [], result);
        return result;
    }

    private recursivelyCountRelatedResponsesForCode(questionContainer: QuestionContainer, answers: ResponseJson, codeDimensions: string[][], stack: string[], result: ResponseCount[]): void {
        if (codeDimensions.length === 0) {
            return;
        }
        for (const code of codeDimensions[0]) {
            stack.push(code);
            if (codeDimensions.length === 1) {
                result.push(this.countRelatedResponses(questionContainer, answers, stack.slice()));
            } else {
                this.recursivelyCountRelatedResponsesForCode(questionContainer, answers, codeDimensions.slice(1), stack, result);
            }
            stack.pop();
        }
    }
    
    countRelatedResponses(questionContainer: QuestionContainer, answers: ResponseJson, codes: string[]): ResponseCount {
        const relations: LabeledRequiredValue[][] = this.createRelations(questionContainer, codes);
        const singleResults: SingleResponseCount[] = [];
        for (const rel of relations) {
            const nextCount: SingleResponseCount = { codes: rel.map((value) => value.label), count: 0 };
            for (const response of answers.responses) {
                if (this.checkRequiredValues(rel, response)) {
                    nextCount.count++;
                }
            }
            singleResults.push(nextCount);
        }
        return { questionCodes: codes, counts: singleResults, stats: [] };
    }

    private checkRequiredValues(values: LabeledRequiredValue[], entry: ResponseEntry): boolean {
        return !values.map((required) => checkRequiredValue(required, entry)).some((checkResult) => checkResult === false);
    }
    
    private createRelations(questionContainer: QuestionContainer, codes: string[]): LabeledRequiredValue[][] {
        const requiredValues: LabeledRequiredValue[][] = codes.map((c) => this.createRequiredValues(questionContainer, c));
        const result: LabeledRequiredValue[][] = [];
        this.recursivelyCreateRelationsFromRequiredValues(requiredValues, [], result);
        return result;
    }

    private recursivelyCreateRelationsFromRequiredValues(values: LabeledRequiredValue[][], stack: LabeledRequiredValue[], result: LabeledRequiredValue[][]): void {
        if (values.length === 0) {
            return;
        }
        for (const firstCellValue of values[0]) {
            stack.push(firstCellValue);
            if (values.length === 1) {
                result.push(stack.slice());
            } else {
                this.recursivelyCreateRelationsFromRequiredValues(values.slice(1), stack, result);
            }
            stack.pop();
        }
    }

    private createRequiredValues(questionContainer: QuestionContainer, code: string): LabeledRequiredValue[] {
        const responses: string[] | undefined = questionContainer.getResponses(code);
        if (responses.length === 0) {
            throw new Error(`Illegal code '${code}'. No responses found.`);
        }
        if (questionContainer.getQuestionType(code) === 'mulitple-choice') {
            return responses.map((responseCode) => ({ code: responseCode, value: Yes, label: questionContainer.getResponses(responseCode)[0] }));
        } else {
            return responses.map((responseValue) => ({ code: code, value: responseValue, label: responseValue }));
        }
    }
}
