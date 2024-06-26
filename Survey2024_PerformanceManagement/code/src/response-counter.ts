import { ResponseCount, SingleResponseCount } from './response-count';
import { QuestionContainer } from './question-container';
import { NoAnswer, Yes } from './constants';
import { ResponseJson } from './responses';

export type CountConfiguration = {
    countNoAnswers: boolean;
    countRelativeFrequency: boolean;
    limitResponsesBy: number;
};

export class ResponseCounter {
    countResponsesForCodes(questionContainer: QuestionContainer, answers: ResponseJson, codes: string[], config: CountConfiguration): ResponseCount[] {
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
            // if (condition && entry[condition.code] !== condition.value) {
            //     continue;
            // }
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

        return { questionCodes: [code], counts: singleResults.length >= config.limitResponsesBy ? singleResults.filter((value) => value.count !== 0) : singleResults, stats: [] };
    }
    
}
